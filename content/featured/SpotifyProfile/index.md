---
date: '2'
title: 'Multithreaded Group Chat Server'
cover: './termChat.jpg'
github: 'https://github.com/SFU-CMPT-201/a11-asheeshyadav1'

tech:
  - Sockets (AF_INET, TCP/IP)
  - Multithreading & Synchronization
  - Custom Binary Messaging Protocol
  - Two-Phase Commit Protocol
  - Fuzzing & Random Data Generation
---

Developed a multithreaded group chat server and custom fuzzing clients in C, implementing a two-phase commit protocol for graceful termination. Built a socket-based messaging system supporting real-time message broadcasting, strict global ordering guarantees, and concurrent client connections using AF_INET. Designed a custom binary message protocol with sender metadata, integrated random message generation using getentropy(), and ensured robust testing with CMake, server/client testers, and concurrency-safe synchronization.
