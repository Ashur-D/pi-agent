---
name: subnetting-physical-layer
description: Physical layer networking and subnetting calculations. Use for IPv4/IPv6 subnetting, CIDR, VLSM, binary conversions, transmission media (copper, fiber), signal decibel/attenuation calculations, and Nyquist/Shannon capacity formulas.
---

# Physical Layer & Subnetting Guide

Formulas, wiring standards, and binary calculations for Layer 1 and IP address planning.

## 1. Subnetting & IP Math (IPv4 & IPv6)

### IPv4 Quick Reference
- Total addresses in prefix `/$n$`: $2^{(32 - n)}$
- Usable hosts: $2^{(32 - n)} - 2$ (subtract network ID and broadcast address)
- Subnet Mask Octet Values:
  - `/25` or `128` (1 bit) -> 128 block size
  - `/26` or `192` (2 bits) -> 64 block size
  - `/27` or `224` (3 bits) -> 32 block size
  - `/28` or `240` (4 bits) -> 16 block size
  - `/29` or `248` (5 bits) -> 8 block size
  - `/30` or `252` (6 bits) -> 4 block size (2 usable hosts, ideal for point-to-point links)
  - `/31` or `254` (RFC 3021 point-to-point)
  - `/32` or `255` (Host route)
- **VLSM Steps:** Always sort required subnets by size descending (largest host requirement first) to prevent subnet overlap.

## 2. Transmission Media & Cabling Standards

### Twisted Pair (UTP / STP) - RJ-45 Pinouts
- **T568A:**
  1. White/Green
  2. Green
  3. White/Orange
  4. Blue
  5. White/Blue
  6. Orange
  7. White/Brown
  8. Brown
- **T568B:**
  1. White/Orange
  2. Orange
  3. White/Green
  4. Blue
  5. White/Blue
  6. Green
  7. White/Brown
  8. Brown
- **Straight-Through:** Same standard on both ends (T568B to T568B).
- **Crossover:** T568A on one end, T568B on the other.

### Fiber Optics
- **Single-Mode Fiber (SMF):** Yellow jacket, ~9 µm core, laser light source, long distances (up to tens of km).
- **Multi-Mode Fiber (MMF):** Orange/Aqua jacket, 50 or 62.5 µm core, LED/VCSEL light source, shorter distances (<550m), prone to modal dispersion.

## 3. Signal Theory & Physics Formulas

### Decibel & Power Conversions
- Power ratio in Decibels: $dB = 10 \cdot \log_{10}(P_2 / P_1)$
- Power relative to 1 milliwatt: $dBm = 10 \cdot \log_{10}(P / 1\text{ mW})$
  - $0\text{ dBm} = 1\text{ mW}$
  - $+3\text{ dB} \approx \text{doubling of power}$
  - $-3\text{ dB} \approx \text{halving of power}$
  - $+10\text{ dB} = 10\times \text{ power}$

### Theoretical Channel Capacity
- **Nyquist Bit Rate (Noiseless channel):**
  $$C = 2B \cdot \log_2(M)$$
  where $B$ = bandwidth in Hz, $M$ = number of signal levels.
- **Shannon Capacity (Noisy channel):**
  $$C = B \cdot \log_2(1 + SNR)$$
  where $SNR = P_{signal} / P_{noise}$ (as a linear ratio, not in dB). If SNR is given in dB: $SNR_{linear} = 10^{(SNR_{dB} / 10)}$.
