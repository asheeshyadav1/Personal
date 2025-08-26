---
date: '3'
title: 'Simple Blockchain Implementation'
cover: './bc.webp'
external: 'https://github.com/SFU-CMPT-201/a12-asheeshyadav1'
cta: 'https://github.com/SFU-CMPT-201/a12-asheeshyadav1'

tech:
  - C Programming
  - OpenSSL libcrypto (SHA-256)
  - Proof-of-Work Mining
  - Blockchain Data Structures
  - CMake Build System
---

Developed a simple blockchain system in C that securely manages a sequence of blocks, ensuring tamper detection and data integrity using SHA-256 cryptographic hashing. Implemented custom functions to initialize a blockchain, add mined blocks, and verify block validity. Designed a mining mechanism that calculates a correct nonce by iterating through values until the block hash satisfies a given difficulty target. Leveraged timestamps, index tracking, and previous hash linking to maintain an immutable and verifiable chain. Integrated OpenSSL’s libcrypto library to generate SHA-256 hashes efficiently and ensured compatibility with provided shared libraries. Extensively tested the system for nonce calculation, hash validation, and blockchain verification under varying difficulty levels.
