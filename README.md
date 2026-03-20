# ChartGen AI — OpenClaw Skill

> **#1 Product of the Day on Product Hunt** 🏆

Transform natural language into professional charts, dashboards, diagrams, and
data analysis reports — powered by [ChartGen AI](https://chartgen.ai) & [Ada.im](https://ada.im).

<p align="center">
  <a href="https://chartgen.ai">
    <img src="https://img.shields.io/badge/ChartGen_AI-Visit_Website-blue?style=for-the-badge" alt="ChartGen AI" />
  </a>
  <a href="https://www.producthunt.com/products/ada-2?launch=chartgen-ai-4">
    <img src="https://img.shields.io/badge/Product_Hunt-%231_Product_of_the_Day-da552f?style=for-the-badge&logo=producthunt&logoColor=white" alt="Product Hunt" />
  </a>
</p>

---

## What Can It Do?

### Charts

All chart types are rendered as high-resolution PNG images.

- Bar Chart, Line Chart, Pie Chart, Area Chart
- Scatter Plot, Heatmap, Combo Chart (dual-axis)
- Waterfall Chart, Funnel Chart
- Radar, Treemap, Sunburst, and any other ECharts-supported type

### Diagrams

All diagrams are rendered as PNG images.

- Flowchart / Graph
- Sequence Diagram, Class Diagram, State Diagram
- ER Diagram (Entity-Relationship)
- Mind Map, Timeline, Kanban Board

### Gantt Charts

Project timelines with task dependencies, rendered as PNG images.

### Dashboards

Multi-chart interactive layouts with embedded ECharts, rendered as PNG images.

### PPT Generation

AI-generated presentation slides with embedded visualizations (returned as raw data).

---

Just describe what you want in plain language — no data formatting or design
skills required. Upload CSV/Excel files for data-driven visualizations.

---

## Installation

### Recommended: Natural Language Install

Copy and send this message to your OpenClaw agent:

> Install this skill for me: `https://github.com/chartgen-ai/chartgen-skill.git`

### Install from ClawHub

```bash
openclaw skills install chartgen
```

### Install from GitHub

```bash
openclaw skills install github:chartgen-ai/chartgen-skill
```

### Manual Installation

1. Clone this repository into your OpenClaw skills directory:

```bash
cd ~/.openclaw/workspace/skills
git clone https://github.com/chartgen-ai/chartgen-skill.git
```

2. Refresh skills:

```bash
openclaw skills refresh
```

---

## Configuration

### 1. Get Your API Key

1. Visit [chartgen.ai/chat](https://chartgen.ai/chat)
2. Click the **menu icon** (☰) in the bottom-left corner
3. Select **"API"**
4. Generate and copy your API key

### 2. Configure the API Key

Set the key using **one** of these methods (the tool reads it automatically):

```bash
# Option A: environment variable
export CHARTGEN_API_KEY="your-api-key-here"

# Option B: save to a file
echo "your-api-key-here" > ~/.chartgen/api_key
```

That's it — the skill and tool handle everything else internally.

---

## Usage Examples

### Generate a Chart

> "Create a pie chart showing market share: Apple 28%, Samsung 20%, Xiaomi 14%, Others 38%"

### Build a Dashboard

> "Build a sales dashboard with monthly revenue trend, top 10 products by sales, and regional distribution"

### Draw a Diagram

> "Draw a flowchart for user registration process: sign up → email verification → profile setup → welcome page"

### Create a Gantt Chart

> "Create a Gantt chart for a 3-month product launch plan with design, development, testing, and release phases"

### Data Analysis Report

> "Analyze this sales data and create a comprehensive report with charts and insights"
> *(attach a CSV/Excel file)*

---

## About ChartGen AI

[ChartGen AI](https://chartgen.ai) is the world's leading AI-powered data
visualization platform, developed by [Ada.im](https://ada.im).

- 🏆 **#1 Product of the Day** on Product Hunt (Feb 2026)
- 🥈 **#2 Product of the Week** on Product Hunt
- 🔒 **SOC 2** compliant data security
- 🎨 **12 professional themes** with one-click export
- 📊 **9+ chart types** — from simple bar charts to complex heatmaps
- 🤖 **Natural language to visualization** — just describe what you need
- 📁 **CSV/Excel support** — upload your data files directly

---

<p align="center">
  Made with ❤️ by <a href="https://chartgen.ai">ChartGen AI</a> · Powered by <a href="https://ada.im">Ada.im</a>
</p>
