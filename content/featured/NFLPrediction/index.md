---
date: '0'
title: 'NFL Football Prediction Software'
cover: './fourth-and-goal.png'
github: 'https://github.com/asheeshyadav1/NFL-Prediction'
tech:
  - PyTorch
  - pgvector
  - Kubernetes
  - GitHub Actions
  - PostgreSQL
---

Trained a PyTorch sequence model to project weekly NFL fantasy points from player and matchup features, evaluated against a naive baseline on a leakage-safe temporal split, and served it as an independently scalable Kubernetes inference service. Grounded an LLM in live injury/news data via pgvector RAG so it explains each start/sit call from the model's projection and retrieved evidence rather than its own guesses, shipped through a GitHub Actions CI/CD pipeline.
