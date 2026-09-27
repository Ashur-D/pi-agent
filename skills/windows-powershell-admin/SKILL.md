---
name: windows-powershell-admin
description: Windows Server and PowerShell administration guide. Use for Active Directory automation, Group Policy, server roles (DNS, DHCP, IIS), NTFS permissions, and PowerShell scripting.
---

# Windows Administration & PowerShell Scripting

Essential patterns and cmdlets for managing Windows Server environments and automating administrative tasks with PowerShell.

## Core PowerShell Principles

- **Object Pipeline:** PowerShell passes .NET objects down the pipeline, not plain text. Use `Select-Object`, `Where-Object`, and `Sort-Object` to filter properties before converting to strings.
- **Error Handling:** Use `$ErrorActionPreference = "Stop"` and `try { ... } catch { Write-Error $_.Exception.Message }` blocks for predictable script execution.
- **Naming Conventions:** Follow `Verb-Noun` syntax (e.g., `Get-Service`, `New-ADUser`, `Set-ItemProperty`).

## Common Windows Server Workflows

### 1. Active Directory Domain Services (AD DS)
- **User management:**
  - Create: `New-ADUser -Name "John Doe" -SamAccountName "jdoe" -UserPrincipalName "jdoe@domain.local" -Enabled $true -AccountPassword (ConvertTo-SecureString "Pass123!" -AsPlainText -Force)`
  - Query: `Get-ADUser -Filter {Department -eq "IT"} -Properties MemberOf, EmailAddress`
  - Group membership: `Add-ADGroupMember -Identity "IT_Admins" -Members "jdoe"`
- **Organizational Units (OUs):**
  - Create: `New-ADOrganizationalUnit -Name "Staff" -Path "DC=domain,DC=local"`

### 2. Group Policy Objects (GPOs)
- Create and link GPO:
  ```powershell
  New-GPO -Name "Disable-USB" | New-GPLink -Target "OU=Workstations,DC=domain,DC=local"
  ```
- Force policy refresh: `gpupdate /force`
- Audit applied policies: `gpresult /r` or `gpresult /h report.html`

### 3. Server Roles & Network Services
- **DNS Server:**
  - Create forward lookup zone: `Add-DnsServerPrimaryZone -Name "lab.local" -ZoneFile "lab.local.dns"`
  - Add A record: `Add-DnsServerResourceRecordA -Name "server01" -ZoneName "lab.local" -IPv4Address "192.168.10.10"`
- **DHCP Server:**
  - Create scope: `Add-DhcpServerv4Scope -Name "Clients" -StartRange 192.168.10.100 -EndRange 192.168.10.200 -SubnetMask 255.255.255.0`
  - Set router option: `Set-DhcpServerv4OptionValue -ScopeId 192.168.10.0 -Router 192.168.10.1 -DnsServer 192.168.10.10`

### 4. Storage, Shares, & NTFS Security
- Share a directory: `New-SmbShare -Name "CompanyDocs" -Path "C:\Data\Docs" -FullAccess "Domain Admins" -ReadAccess "Authenticated Users"`
- Manage NTFS ACLs using `Get-Acl` and `Set-Acl` or `icacls.exe`.

### 5. Diagnostics & Event Logs
- Query event logs: `Get-WinEvent -FilterHashtable @{LogName='System'; Level=2; StartTime=(Get-Date).AddDays(-1)}`
- Check listening ports: `Get-NetTCPConnection -State Listen`
