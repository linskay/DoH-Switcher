using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Runtime.InteropServices;
using System.Threading;
using Microsoft.Win32;

class Program {
    [DllImport("dnsapi.dll", EntryPoint = "DnsFlushResolverCache")]
    static extern int DnsFlushResolverCache();

    static void Main(string[] args) {
        try {
            Stream stdin = Console.OpenStandardInput();
            Stream stdout = Console.OpenStandardOutput();

            // Read 4-byte message length
            byte[] lenBytes = new byte[4];
            int read = stdin.Read(lenBytes, 0, 4);
            if (read < 4) return;

            int len = BitConverter.ToInt32(lenBytes, 0);
            // Limit message size to 16KB to prevent memory exhaustion attacks
            if (len <= 0 || len > 16384) return;

            byte[] buffer = new byte[len];
            int total = 0;
            while (total < len) {
                int r = stdin.Read(buffer, total, len - total);
                if (r <= 0) break;
                total += r;
            }

            string json = Encoding.UTF8.GetString(buffer, 0, total);

            // Handle PING
            if (json.Contains("\"PING\"")) {
                SendResponse(stdout, true, "automatic", "", false, false, false, "PONG // Host Ready");
                return;
            }

            // Extract action, mode, and template cleanly
            string action = ExtractJsonValue(json, "action");
            string mode = ExtractJsonValue(json, "mode");
            string template = ExtractJsonValue(json, "template");

            // 1. Strict Action Whitelisting
            if (action != "SET_DOH") {
                SendResponse(stdout, false, "error", "", false, false, false, "SECURITY REJECT: Unauthorized action. Only SET_DOH permitted.");
                return;
            }

            // 2. Strict Mode Whitelisting
            if (string.IsNullOrEmpty(mode)) {
                mode = "automatic";
            } else {
                mode = mode.ToLowerInvariant();
            }

            if (mode != "secure" && mode != "off" && mode != "automatic") {
                mode = "automatic";
            }

            // 3. Strict HTTPS enforcement and Input Sanitization for Secure DoH mode
            if (mode == "secure") {
                if (string.IsNullOrEmpty(template)) {
                    SendResponse(stdout, false, "error", "", false, false, false, "SECURITY REJECT: Secure mode requires a valid DoH template URL.");
                    return;
                }

                template = template.Trim();

                // Length & Character Sanitization: reject control characters, quotes, backslashes
                if (template.Length > 2048) {
                    SendResponse(stdout, false, "error", "", false, false, false, "SECURITY REJECT: URL exceeds maximum length limit (2048 chars).");
                    return;
                }
                for (int i = 0; i < template.Length; i++) {
                    char c = template[i];
                    if (c < 32 || c > 126 || c == '"' || c == '\\' || c == '<' || c == '>') {
                        SendResponse(stdout, false, "error", "", false, false, false, "SECURITY REJECT: URL contains illegal control or dangerous characters.");
                        return;
                    }
                }

                // Explicitly reject plain HTTP or non-secure protocols
                if (template.StartsWith("http://", StringComparison.OrdinalIgnoreCase)) {
                    SendResponse(stdout, false, "error", "", false, false, false, "SECURITY REJECT: Insecure plaintext HTTP forbidden. DNS-over-HTTPS requires strict HTTPS.");
                    return;
                }

                // Auto-prepend https:// if scheme is missing entirely
                if (!template.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) {
                    template = "https://" + template;
                }

                // Deep URI Validation: verify scheme, hostname and validity
                try {
                    string cleanUri = template.Replace("{?dns}", "");
                    Uri uri = new Uri(cleanUri);
                    if (uri.Scheme != Uri.UriSchemeHttps) {
                        SendResponse(stdout, false, "error", "", false, false, false, "SECURITY REJECT: URI scheme must be HTTPS.");
                        return;
                    }
                    if (string.IsNullOrEmpty(uri.Host) || uri.Host.Length < 3 || uri.Host.StartsWith(".") || uri.Host.EndsWith(".")) {
                        SendResponse(stdout, false, "error", "", false, false, false, "SECURITY REJECT: Invalid host in DoH template URL.");
                        return;
                    }
                } catch (Exception uriEx) {
                    SendResponse(stdout, false, "error", "", false, false, false, "SECURITY REJECT: Malformed DoH URL: " + uriEx.Message);
                    return;
                }

                // Ensure RFC 8484 GET template placeholder {?dns} if not present
                if (!template.Contains("{?dns}") && !template.Contains("?")) {
                    template = template + "{?dns}";
                }
            } else {
                template = "";
            }

            // CRITICAL TRANSITION: Teardown existing socket pool if switching in secure mode
            if (mode == "secure") {
                SetRegistryPolicies("off", "");
                Thread.Sleep(60);
            }

            bool regOk = false;
            bool localStateOk = false;
            bool cacheOk = false;

            // 1. Write Registry Policies (HKLM + HKCU)
            try {
                regOk = SetRegistryPolicies(mode, template);
            } catch (Exception ex) {
                regOk = false;
            }

            // 2. Write Chromium Local State
            try {
                localStateOk = UpdateAllLocalStates(mode, template);
            } catch {
                localStateOk = false;
            }

            // 3. Flush OS DNS Resolver Cache
            try {
                int flushRes = DnsFlushResolverCache();
                cacheOk = (flushRes == 1 || flushRes == 0);
            } catch {
                cacheOk = false;
            }

            // Determine overall success: either registry or local state succeeded
            bool overallSuccess = (regOk || localStateOk);
            string msg = overallSuccess ? "DNS policy applied successfully" : "Failed to write policies";

            SendResponse(stdout, overallSuccess, mode, template, regOk, localStateOk, cacheOk, msg);

        } catch (Exception ex) {
            try {
                Stream stdout = Console.OpenStandardOutput();
                SendResponse(stdout, false, "error", "", false, false, false, "Host Exception: " + ex.Message.Replace("\"", "'"));
            } catch {}
        }
    }

    static string ExtractJsonValue(string json, string key) {
        int idx = json.IndexOf("\"" + key + "\"");
        if (idx < 0) return "";
        int colon = json.IndexOf(':', idx);
        if (colon < 0) return "";
        int q1 = json.IndexOf('"', colon);
        if (q1 < 0) return "";
        int q2 = json.IndexOf('"', q1 + 1);
        if (q2 < 0) return "";
        return json.Substring(q1 + 1, q2 - q1 - 1).Replace("\\/", "/");
    }

    static RegistryKey OpenOrCreateKey(RegistryKey root, string subKey) {
        try {
            RegistryKey key = root.OpenSubKey(subKey, true);
            if (key != null) return key;
        } catch {}
        try {
            return root.CreateSubKey(subKey);
        } catch {}
        return null;
    }

    static bool SetRegistryPolicies(string mode, string template) {
        bool written = false;

        string[] targets = new string[] {
            @"Software\Policies\Google\Chrome",
            @"Software\Policies\Microsoft\Edge"
        };

        foreach (string path in targets) {
            // Write to HKLM (Primary for Chrome live policy engine on all Windows editions)
            try {
                using (RegistryKey key = OpenOrCreateKey(Registry.LocalMachine, path)) {
                    if (key != null) {
                        key.SetValue("DnsOverHttpsMode", mode, RegistryValueKind.String);
                        if (mode == "secure" && !string.IsNullOrEmpty(template)) {
                            key.SetValue("DnsOverHttpsTemplates", template, RegistryValueKind.String);
                        } else {
                            try { key.DeleteValue("DnsOverHttpsTemplates", false); } catch {}
                        }
                        written = true;
                    }
                }
            } catch {}

            // Write to HKCU (Secondary)
            try {
                using (RegistryKey key = OpenOrCreateKey(Registry.CurrentUser, path)) {
                    if (key != null) {
                        key.SetValue("DnsOverHttpsMode", mode, RegistryValueKind.String);
                        if (mode == "secure" && !string.IsNullOrEmpty(template)) {
                            key.SetValue("DnsOverHttpsTemplates", template, RegistryValueKind.String);
                        } else {
                            try { key.DeleteValue("DnsOverHttpsTemplates", false); } catch {}
                        }
                        written = true;
                    }
                }
            } catch {}
        }

        return written;
    }

    static bool UpdateAllLocalStates(string mode, string template) {
        bool any = false;
        string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string[] candidates = new string[] {
            Path.Combine(localAppData, @"Google\Chrome\User Data\Local State"),
            Path.Combine(localAppData, @"Microsoft\Edge\User Data\Local State"),
            Path.Combine(localAppData, @"BraveSoftware\Brave-Browser\User Data\Local State"),
            Path.Combine(localAppData, @"Chromium\User Data\Local State")
        };

        foreach (string p in candidates) {
            try {
                if (File.Exists(p)) {
                    UpdateLocalStateFile(p, mode, template);
                    any = true;
                }
            } catch {}
        }
        return any;
    }

    static void UpdateLocalStateFile(string filePath, string mode, string template) {
        string text = File.ReadAllText(filePath, Encoding.UTF8);
        string safeMode = EscapeJson(mode);
        string safeTemplate = EscapeJson(mode == "secure" ? template : "");
        string block = "\"dns_over_https\":{\"mode\":\"" + safeMode + "\",\"templates\":\"" + safeTemplate + "\"}";

        if (Regex.IsMatch(text, "\"dns_over_https\"\\s*:\\s*\\{[^}]*\\}")) {
            text = Regex.Replace(text, "\"dns_over_https\"\\s*:\\s*\\{[^}]*\\}", block);
        } else {
            int brace = text.IndexOf('{');
            if (brace >= 0) {
                text = text.Substring(0, brace + 1) + block + "," + text.Substring(brace + 1);
            }
        }
        File.WriteAllText(filePath, text, Encoding.UTF8);
    }

    static void SendResponse(Stream stdout, bool success, string mode, string template, bool registry, bool localState, bool cacheFlushed, string message) {
        string reply = "{" +
            "\"success\":" + (success ? "true" : "false") + "," +
            "\"mode\":\"" + EscapeJson(mode) + "\"," +
            "\"template\":\"" + EscapeJson(template) + "\"," +
            "\"registry\":" + (registry ? "true" : "false") + "," +
            "\"localState\":" + (localState ? "true" : "false") + "," +
            "\"cacheFlushed\":" + (cacheFlushed ? "true" : "false") + "," +
            "\"message\":\"" + EscapeJson(message) + "\"" +
        "}";

        byte[] replyBytes = Encoding.UTF8.GetBytes(reply);
        byte[] outLen = BitConverter.GetBytes(replyBytes.Length);

        stdout.Write(outLen, 0, 4);
        stdout.Write(replyBytes, 0, replyBytes.Length);
        stdout.Flush();
    }

    static string EscapeJson(string s) {
        if (s == null) return "";
        return s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\r", "").Replace("\n", " ");
    }
}
