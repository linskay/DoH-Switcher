using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
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

            // Parse mode & template
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

            bool hklmOk = false;
            bool hkcuOk = false;
            bool localStateOk = false;

            // 1. Write HKLM Policies (Enforced globally on Windows without domain requirements)
            try {
                using (RegistryKey key = Registry.LocalMachine.CreateSubKey(@"Software\Policies\Google\Chrome")) {
                    if (key != null) {
                        key.SetValue("DnsOverHttpsMode", mode, RegistryValueKind.String);
                        if (mode == "secure" && !string.IsNullOrEmpty(template)) {
                            key.SetValue("DnsOverHttpsTemplates", template, RegistryValueKind.String);
                        } else {
                            try { key.DeleteValue("DnsOverHttpsTemplates", false); } catch {}
                        }
                        hklmOk = true;
                    }
                }
            } catch {}

            try {
                using (RegistryKey edgeKey = Registry.LocalMachine.CreateSubKey(@"Software\Policies\Microsoft\Edge")) {
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

            // 2. Write HKCU Policies
            try {
                using (RegistryKey key = Registry.CurrentUser.CreateSubKey(@"Software\Policies\Google\Chrome")) {
                    if (key != null) {
                        key.SetValue("DnsOverHttpsMode", mode, RegistryValueKind.String);
                        if (mode == "secure" && !string.IsNullOrEmpty(template)) {
                            key.SetValue("DnsOverHttpsTemplates", template, RegistryValueKind.String);
                        } else {
                            try { key.DeleteValue("DnsOverHttpsTemplates", false); } catch {}
                        }
                        hkcuOk = true;
                    }
                }
            } catch {}

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

            // 3. Update Chromium Local State files directly
            string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string[] localStatePaths = new string[] {
                Path.Combine(localAppData, @"Google\Chrome\User Data\Local State"),
                Path.Combine(localAppData, @"Microsoft\Edge\User Data\Local State"),
                Path.Combine(localAppData, @"BraveSoftware\Brave-Browser\User Data\Local State"),
                Path.Combine(localAppData, @"Chromium\User Data\Local State")
            };

            foreach (string p in localStatePaths) {
                try {
                    if (File.Exists(p)) {
                        UpdateLocalStateDns(p, mode, template);
                        localStateOk = true;
                    }
                } catch {}
            }

            // Reply to extension
            string reply = "{\"success\":true,\"mode\":\"" + mode + "\",\"template\":\"" + template + "\",\"hklm\":" + (hklmOk ? "true" : "false") + ",\"hkcu\":" + (hkcuOk ? "true" : "false") + ",\"localState\":" + (localStateOk ? "true" : "false") + "}";
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

    static void UpdateLocalStateDns(string filePath, string mode, string template) {
        string text = File.ReadAllText(filePath, Encoding.UTF8);

        string dohReplacement = "\"dns_over_https\":{\"mode\":\"" + mode + "\",\"templates\":\"" + (mode == "secure" ? template : "") + "\"}";

        if (Regex.IsMatch(text, "\"dns_over_https\"\\s*:\\s*\\{[^}]*\\}")) {
            text = Regex.Replace(text, "\"dns_over_https\"\\s*:\\s*\\{[^}]*\\}", dohReplacement);
        } else {
            // Insert at beginning of root object
            int firstBrace = text.IndexOf('{');
            if (firstBrace >= 0) {
                text = text.Substring(0, firstBrace + 1) + dohReplacement + "," + text.Substring(firstBrace + 1);
            }
        }

        File.WriteAllText(filePath, text, Encoding.UTF8);
    }
}
