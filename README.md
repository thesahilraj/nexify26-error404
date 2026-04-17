# nexify26-error404
Project - Dr. Farm
AI-Powered Predictive Crop Intelligence & Smart Field Monitoring System

## Overview

DrFarm is a predictive crop intelligence system that integrates Artificial Intelligence and IoT to detect crop diseases, monitor environmental conditions, and generate data-driven action plans for farmers.

The system currently focuses on Rice and Wheat crops and enables early disease detection, environmental risk analysis, and a dynamic Farm Health Score to reduce crop loss and improve productivity.

DrFarm combines image-based deep learning inference, real-time IoT sensor monitoring, and a cloud-based dashboard for structured farm decision support.

---

## Problem Statement

Agriculture faces several persistent challenges:

- Late detection of crop diseases
- Manual and inconsistent field monitoring
- Poor environmental risk awareness
- Yield losses due to delayed intervention
- Limited access to affordable precision agriculture tools

Farmers often react after damage becomes visible. DrFarm shifts the model from reactive farming to predictive and preventive farming.

---

## Solution

DrFarm provides:

- AI-based crop disease detection from leaf images
- IoT-based environmental monitoring
- Environmental risk percentage calculation
- Dynamic Farm Health Score
- Semi-dynamic 7-day action plan
- Centralized real-time monitoring dashboard

The platform enables proactive farm management using measurable environmental and disease data.

---

## Supported Crops & Diseases

### Rice
- Leaf Blast
- Brown Spot
- Healthy

### Wheat
- Leaf Rust
- Powdery Mildew
- Healthy

---

## System Architecture

### 1. AI Disease Detection Module
- Model: MobileNetV2 / EfficientNet (fine-tuned)
- Input: Leaf image
- Output: Disease class + confidence score
- Deployment: Cloud-based inference

### 2. IoT Smart Field Node
- Microcontroller: ESP32
- Sensors:
  - Soil Moisture Sensor
  - Temperature & Humidity Sensor (DHT11/DHT22)
  - Gas Sensors (MQ2, MQ7)
- Connectivity: WiFi / GSM
- Data Transmission: Cloud backend

### 3. Backend & Dashboard
- Backend: PHP
- Database: MySQL
- Risk Calculation Engine
- Farm Health Score Algorithm
- Action Plan Generator

---

## Farm Health Score

The Farm Health Score is calculated using:

- Disease detection confidence
- Environmental threshold risk levels
- Soil moisture conditions
- Temperature and humidity patterns

The score dynamically updates based on real-time data and reflects overall crop health status.

---

## 7-Day Action Plan

DrFarm generates a semi-dynamic 7-day action plan based on:

- Detected disease type
- Environmental risk conditions
- Preventive agricultural guidelines

This provides structured and actionable recommendations instead of generic advice.

---

## Tech Stack

- Open AI API & Gemmini API
- ESP32 (Arduino IDE)
- PHP
- MySQL
- HTML / CSS / JavaScript
- OpenAI API (Agriculture chatbot module)

---

## Future Scope

- Expansion to additional crops
- Edge AI inference for offline farms
- Marketplace integration
- MSP quality alignment scoring
- Loan risk profiling for agri-financing

---

## Goal

DrFarm aims to reduce crop losses through early detection, proactive intervention, and affordable precision agriculture using AI and IoT integration.