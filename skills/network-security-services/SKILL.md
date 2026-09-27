---
name: network-security-services
description: Network security, packet analysis, and server service configuration. Use for Wireshark/PCAP capture analysis, protocol debugging (TCP, DNS, DHCP, TLS), firewall rules (iptables, UFW), and security auditing.
---

# Network Security & Service Applications

Guide for troubleshooting network protocols, analyzing packet captures, configuring core network services, and applying security controls.

## 1. Packet Analysis & Wireshark / tcpdump

### Capture & Display Filters
- Capture traffic via CLI: `tcpdump -i eth0 -nn -w capture.pcap "tcp port 80 or tcp port 443"`
- Key Wireshark display filters:
  - TCP Handshake: `tcp.flags.syn == 1`
  - Resets / Drops: `tcp.flags.reset == 1`
  - Retransmissions: `tcp.analysis.retransmission`
  - DNS queries/responses: `dns && ip.addr == 192.168.1.5`
  - HTTP requests: `http.request.method == "POST"`
  - TLS Handshake: `tls.handshake.type == 1` (Client Hello)

### Protocol State Verification
- **TCP 3-Way Handshake:** Client `SYN` -> Server `SYN-ACK` -> Client `ACK`.
- **TCP Teardown:** `FIN` -> `ACK` -> `FIN` -> `ACK` (or abrupt `RST`).
- **DHCP DORA:** Discover (broadcast) -> Offer (unicast/broadcast) -> Request -> Acknowledge.
- **DNS Resolution:** Recursive vs Iterative resolution; verify A, AAAA, PTR, CNAME, and MX record lookups.

## 2. Linux Network Services

- **DNS (BIND9):**
  - Config: `/etc/bind/named.conf.local`, zone files in `/var/named` or `/etc/bind/zones`.
  - Validate syntax: `named-checkconf`, `named-checkzone example.com /etc/bind/db.example.com`.
- **Web Server (Apache / Nginx):**
  - Virtual hosts configuration and testing: `apache2ctl -t` or `nginx -t`.
  - Enforce TLS/HTTPS with strong ciphers and HSTS.
- **SSH Hardening:**
  - File: `/etc/ssh/sshd_config`
  - Best practices: `PermitRootLogin no`, `PasswordAuthentication no` (enforce key-based), `MaxAuthTries 3`.

## 3. Firewalls & Access Controls

- **iptables / nftables:**
  - Allow established connections: `iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT`
  - Allow specific service: `iptables -A INPUT -p tcp --dport 22 -s 192.168.1.0/24 -j ACCEPT`
  - Default drop policy: `iptables -P INPUT DROP`
- **UFW (Ubuntu):**
  - `ufw default deny incoming`, `ufw allow 22/tcp`, `ufw enable`.

## 4. Threat & Security Concepts

- **Common Attack Vectors:** ARP spoofing/poisoning, DNS cache poisoning, SYN flood (DoS), Man-in-the-Middle (MITM), Brute force.
- **Cryptographic Principles:** Symmetric (AES) vs Asymmetric (RSA/ECC), Hashing (SHA-256 for integrity, bcrypt/Argon2 for passwords), Digital Signatures (authenticity and non-repudiation).
