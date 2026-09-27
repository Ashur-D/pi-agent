---
name: network-python
description: Python network programming and automation guide. Use for socket programming, packet crafting (Scapy), SSH automation (Netmiko, Paramiko), REST APIs, and parsing network configs (JSON, YAML).
---

# Python Network Programming & Automation

Practical guidance for developing, testing, and debugging network scripts in Python.

## Core Topics & Libraries

### 1. Low-Level Sockets (`socket`)
- Standard TCP server/client loop:
  - Server: `socket.socket(socket.AF_INET, socket.SOCK_STREAM)` -> `bind()` -> `listen()` -> `accept()` -> `recv()` / `sendall()`.
  - Client: `connect()` -> `sendall()` -> `recv()`.
  - Always set timeouts (`sock.settimeout(5.0)`) and use context managers (`with socket.socket(...) as s:`) to guarantee closure.
- UDP programming:
  - Use `socket.SOCK_DGRAM`.
  - Use `sendto()` and `recvfrom()` without `connect()` or `listen()`.
  - Remember UDP is connectionless and unsegmented.
- Byte encoding: Sockets transmit raw bytes. Always encode strings (`msg.encode('utf-8')`) before sending, and decode received bytes (`data.decode('utf-8')`).

### 2. Packet Crafting & Sniffing (`scapy`)
- Layer stacking: `packet = IP(dst="192.168.1.1")/TCP(dport=80, flags="S")`
- Sending packets:
  - `send()`: Layer 3 sending (scapy handles layer 2).
  - `sendp()`: Layer 2 sending (requires custom Ethernet header).
  - `sr()` / `sr1()`: Send and receive responses (Layer 3). `sr1()` returns the first reply.
- Sniffing: `sniff(filter="tcp and port 80", prn=process_packet, count=10)`
- Inspecting: `packet.show()`, `packet.summary()`, `ls(TCP)`.

### 3. Device Automation (`paramiko`, `netmiko`)
- Use `netmiko.ConnectHandler` for multi-vendor network equipment (Cisco IOS, JunOS, etc.).
- Always handle disconnects and timeouts with try/except: `NetmikoTimeoutException`, `NetmikoAuthenticationException`.
- Send configuration changes using `send_config_set()`, read operational data using `send_command()`.

### 4. Data Serialization & Network APIs
- Parsing structured outputs: Convert JSON (`json.loads()`, `json.dumps()`), YAML (`yaml.safe_load()`), and CSV.
- HTTP requests with `requests` or `urllib`:
  - Handle authentication headers (Bearer token, Basic auth).
  - Check HTTP status codes (`response.raise_for_status()`).

## Debugging Checklist
- Is the IP reachable? Verify via ping or `socket.create_connection((host, port), timeout=3)`.
- Is the firewall blocking incoming ports?
- Are packets stuck in buffer? Ensure `sendall()` is used instead of `send()`.
- Handle `socket.error`, `ConnectionRefusedError`, and `BrokenPipeError` gracefully.
