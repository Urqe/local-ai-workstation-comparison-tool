# Local AI Workstation Decision Tool

A small, self-contained browser calculator for comparing the economics and practical model fit of **local AI workstations** against **cloud AI subscriptions/API usage**.

Live site: https://urqe.github.io/local-ai-workstation-comparison-tool/

The tool includes workstation presets for Apple Silicon, representative Windows gaming/workstation systems, and a Linux AI server; workload presets from occasional coding through heavy autonomous-agent usage; gross-vs-net VAT modeling; cloud subscription and overflow estimates; model-size/quantization/context memory estimates; an ownership-period-based resale depreciation curve; electricity; retained cloud spending; and explicit runtime-validation limits.

## Run locally

No build step or server is required. Download `index.html` and open it in a modern browser.

## Important assumptions

This is a **planning model, not a benchmark database**. The code comments explain the modeling choices, but the most important ones are:

- Apple prices are based on Finnish Apple Store gross pricing/configurations where available. Generic Windows/Linux prices are representative Finnish-market estimates.
- Apple unified memory is treated as fast AI memory. NVIDIA systems use GPU VRAM for the model-fit calculation rather than total system RAM.
- Hardware and cloud-subscription prices are entered/stored gross. Net mode removes the fixed Finnish VAT rate of 25.5%. Electricity is entered directly on the chosen calculation basis.
- The paid overflow €/M-token control is a **net API-equivalent rate**. Gross mode adds VAT; Net mode leaves the rate unchanged.
- Cloud subscription limits are converted into an adjustable monthly token-equivalent for comparison. Real provider limits are usually rolling/rate-based rather than a literal monthly token bucket.
- Local electricity covers **AI-active compute only**. Idle/sleep power is excluded because it varies substantially by device and usage pattern, which means the model can slightly favour local hardware if a machine is left powered on for long periods.
- Power draw, workload intensity, model targets and token throughput are planning estimates. Fixed generation-speed scores have been removed: speed and task quality are unverified until tested on the selected model/runtime. Real results depend on model architecture, quantization, context length, runtime, caching, batching and software stack.
- Four workstation comparison slots are intentional so the charts remain legible on both desktop and phone-sized screens.

## Cost and recommendation semantics

- Cards, comparison rows, chart series and decision text use the same pure `CalculatorModel.calculate` result embedded in `index.html`.
- Cash costs include purchase, active-compute electricity and any retained cloud bill, less resale at the end of the selected period. Cash break-even is the first crossover within that period, with sale-only crossings identified explicitly. Privacy value never changes the cash chart or cash break-even.
- The adjusted-cost winner compares cloud with local scenarios meeting the estimated memory target plus 5% headroom. A memory-fit result does not establish runtime compatibility, generation speed, or equivalent completed work.
- Advanced controls allow a custom resale percentage and a retained share of the modeled cloud bill. Retained cloud cost reduces applied privacy value by the same share as an explicit simplifying assumption; expenditure is not a measured privacy metric.
- The default depreciation curve is generic and applied equally to all scenarios. Use the override to test different resale assumptions; actual resale varies by hardware and market.
- Catalog prices are static, not fetched live. Verify retailer pricing, configurations and runtime compatibility before a purchase.
- Reset restores all inputs and workstations together. Existing v2 browser preferences are retained; invalid saved values are ignored.

## Validation

Run `node --test tests/*.test.cjs` with Node.js 20 or newer. No package installation is needed. Tests cover cost/series consistency, break-even, VAT, resale, cloud fallback, candidate eligibility, preset round trips, reset and saved-state validation. State tests use a lightweight DOM boundary harness; they do not replace browser layout checks.

## Privacy

The calculator is entirely client-side. It does not send your slider values or scenarios anywhere. Preferences are saved only in your browser's `localStorage` so they survive a refresh.

## Project structure

The application intentionally remains a single `index.html` file: no dependencies, build chain, backend or package manager are required. This keeps the GitHub Pages deployment and offline sharing trivial.

## License

MIT License. See [LICENSE](LICENSE).
