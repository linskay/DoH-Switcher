/**
 * DoH-Switcher // RFC 8484 DNS-over-HTTPS & RFC 1035 Packet Parser
 */

/**
 * Normalize DoH Template URL to RFC 8484 GET format
 */
export function normalizeDohUrl(url) {
  let clean = (url || '').trim();
  if (!clean) return '';

  // Strip wrapping quotes or angle brackets
  clean = clean.replace(/^[<"']+|[>"']+$/g, '');

  // Prepend https:// if missing
  if (!/^https?:\/\//i.test(clean)) {
    clean = 'https://' + clean;
  } else if (clean.startsWith('http://')) {
    clean = 'https://' + clean.slice(7);
  }

  // Append {?dns} placeholder if no query params present
  if (!clean.includes('{?dns}') && !clean.includes('?')) {
    clean += '{?dns}';
  }

  return clean;
}

/**
 * Format DoH URL for clean display in UI (stripping {?dns} / {dns} template variables)
 */
export function formatDisplayUrl(url) {
  if (!url) return '';
  return url.replace(/\{(\?)?dns\}/gi, '');
}

/**
 * Parse and validate RFC 1035 / RFC 8484 binary DNS Wire response
 */
export function parseDnsWireResponse(bytes, expectedId = 0) {
  if (!bytes || bytes.length < 12) {
    return { ok: false, error: 'MALFORMED_DNS_PACKET (Len < 12)' };
  }

  // 1. Transaction ID (bytes 0-1)
  const id = (bytes[0] << 8) | bytes[1];
  if (id !== expectedId) {
    return { ok: false, error: `DNS_ID_MISMATCH (Expected ${expectedId}, Got ${id})` };
  }

  // 2. Flags (bytes 2-3)
  const flags = (bytes[2] << 8) | bytes[3];
  const qr = (flags >> 15) & 0x01; // Bit 15: 0=Query, 1=Response
  if (qr !== 1) {
    return { ok: false, error: 'NOT_A_DNS_RESPONSE (QR=0)' };
  }

  const opcode = (flags >> 11) & 0x0F; // Bits 11-14: OpCode (0 = Standard Query)
  if (opcode !== 0) {
    return { ok: false, error: `UNEXPECTED_OPCODE (${opcode})` };
  }

  const rcode = flags & 0x0F; // Bits 0-3: Reply Code
  if (rcode !== 0) {
    const rcodeNames = {
      1: 'FORMERR',
      2: 'SERVFAIL',
      3: 'NXDOMAIN',
      4: 'NOTIMP',
      5: 'REFUSED'
    };
    return { ok: false, error: `DNS_${rcodeNames[rcode] || ('RCODE_' + rcode)}` };
  }

  // 3. Question & Answer Counts
  const qdCount = (bytes[4] << 8) | bytes[5];
  const anCount = (bytes[6] << 8) | bytes[7];

  if (qdCount < 1) {
    return { ok: false, error: 'NO_QUESTION_SECTION' };
  }

  return { ok: true, id, rcode, qdCount, anCount };
}

/**
 * Live DoH Endpoint Test (RFC 8484 DNS Query Probe + Binary Packet Validation + Fallback)
 */
export async function testDohEndpoint(endpointUrl) {
  const clean = normalizeDohUrl(endpointUrl);
  // RFC 8484 standard query for example.com (Type A, IN, ID 0)
  const dnsQueryBase64 = 'AAABAAABAAAAAAAAB2V4YW1wbGUDY29tAAABAAEA';

  let targetUrl = clean;
  if (clean.includes('{?dns}')) {
    targetUrl = clean.replace('{?dns}', `?dns=${dnsQueryBase64}`);
  } else if (!clean.includes('?')) {
    targetUrl = `${clean}?dns=${dnsQueryBase64}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  const t0 = performance.now();
  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/dns-message, application/dns-json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const t1 = performance.now();
    const latency = Math.round(t1 - t0);

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      return { ok: false, latency: null, error: 'RETURNS HTML (NOT DOH)' };
    }

    if (!res.ok) {
      return { ok: false, latency: null, error: `HTTP ${res.status}` };
    }

    // 1. Binary DNS Wire Verification (RFC 8484 + RFC 1035)
    if (contentType.includes('application/dns-message')) {
      const arrayBuf = await res.arrayBuffer();
      const dnsBytes = new Uint8Array(arrayBuf);
      const parsedDns = parseDnsWireResponse(dnsBytes, 0);
      if (!parsedDns.ok) {
        return { ok: false, latency: null, error: parsedDns.error };
      }
      return {
        ok: true,
        latency: latency,
        status: res.status,
        resolvedUrl: clean,
        answers: parsedDns.anCount
      };
    } else {
      // 2. Standard 200 OK fallback
      return { ok: true, latency: latency, status: res.status, resolvedUrl: clean };
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      return { ok: false, latency: null, error: 'TIMEOUT (6s)' };
    }

    // CORS or fetch fallback probe with mode: 'no-cors'
    try {
      const fbController = new AbortController();
      const fbTimeout = setTimeout(() => fbController.abort(), 4500);
      const fbT0 = performance.now();
      await fetch(targetUrl, {
        method: 'GET',
        mode: 'no-cors',
        signal: fbController.signal
      });
      clearTimeout(fbTimeout);
      const fbT1 = performance.now();
      const fbLatency = Math.round(fbT1 - fbT0);
      return { ok: true, latency: fbLatency, status: 200, resolvedUrl: clean };
    } catch (fbErr) {
      return {
        ok: false,
        latency: null,
        error: fbErr.name === 'AbortError' ? 'TIMEOUT (4.5s)' : (fbErr.message || 'UNREACHABLE')
      };
    }
  }
}
