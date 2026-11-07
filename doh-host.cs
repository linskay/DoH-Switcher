using System;
using System.IO;
using System.Text;
using Microsoft.Win32;

class Program {
    static void Main(string[] args) {
        try {
            Stream stdin = Console.OpenStandardInput();
            Stream stdout = Console.OpenStandardOutput();

            // Read 4 bytes length
            byte[] lenBytes = new byte[4];
            int read = stdin.Read(lenBytes, 0, 4);
            if (read < 4) return;

            int len = BitConverter.ToInt32(lenBytes, 0);
            if (len <= 0 || len > 1024 * 1024) return;

            byte[] buffer = new byte[len];
            int total = 0;
            while (total < len) {
                int r = stdin.Read(buffer, total, len - total);
                if (r <= 0) break;
                total += r;
            }

            string json = Encoding.UTF8.GetString(buffer, 0, total);

            // Simple JSON parsing without external dependencies
            string mode = "automatic";
            string template = "";

            if (json.Contains("\"mode\":\"secure\"") || json.Contains("\"mode\": \"secure\"")) {
                mode = "secure";
            } else if (json.Contains("\"mode\":\"off\"") || json.Contains("\"mode\": \"off\"")) {
                mode = "off";
            } else if (json.Contains("\"mode\":\"automatic\"") || json.Contains("\"mode\": \"automatic\"")) {
                mode = "automatic";
            }

            int tIdx = json.IndexOf("\"template\"");
            if (tIdx >= 0) {
                int col = json.IndexOf(':', tIdx);
                int q1 = json.IndexOf('"', col);
                int q2 = json.IndexOf('"', q1 + 1);
                if (q1 >= 0 && q2 > q1) {
                    template = json.Substring(q1 + 1, q2 - q1 - 1).Replace("\\/", "/");
                }
            }

            // Write to Chrome Registry Policies (HKCU - no admin required!)
            using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Policies\Google\Chrome")) {
                if (key != null) {
                    key.SetValue("DnsOverHttpsMode", mode, RegistryValueKind.String);
                    if (mode == "secure" && !string.IsNullOrEmpty(template)) {
                        key.SetValue("DnsOverHttpsTemplates", template, RegistryValueKind.String);
                    } else {
                        try { key.DeleteValue("DnsOverHttpsTemplates", false); } catch {}
                    }
                }
            }

            // Also set for Chromium & Edge if present
            try {
                using (RegistryKey edgeKey = Registry.CurrentUser.CreateSubKey(@"Software\Policies\Microsoft\Edge")) {
                    if (edgeKey != null) {
                        edgeKey.SetValue("DnsOverHttpsMode", mode, RegistryValueKind.String);
                        if (mode == "secure" && !string.IsNullOrEmpty(template)) {
                            edgeKey.SetValue("DnsOverHttpsTemplates", template, RegistryValueKind.String);
                        } else {
                            try { edgeKey.DeleteValue("DnsOverHttpsTemplates", false); } catch {}
                        }
                    }
                }
            } catch {}

            // Send reply
            string reply = "{\"success\":true,\"mode\":\"" + mode + "\",\"template\":\"" + template + "\"}";
            byte[] replyBytes = Encoding.UTF8.GetBytes(reply);
            byte[] outLen = BitConverter.GetBytes(replyBytes.Length);

            stdout.Write(outLen, 0, 4);
            stdout.Write(replyBytes, 0, replyBytes.Length);
            stdout.Flush();
        } catch (Exception ex) {
            try {
                Stream stdout = Console.OpenStandardOutput();
                string errReply = "{\"success\":false,\"error\":\"" + ex.Message.Replace("\"", "'") + "\"}";
                byte[] b = Encoding.UTF8.GetBytes(errReply);
                stdout.Write(BitConverter.GetBytes(b.Length), 0, 4);
                stdout.Write(b, 0, b.Length);
                stdout.Flush();
            } catch {}
        }
    }
}
