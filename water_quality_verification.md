# Water Quality System Verification

## Indicators
- [x] **Active Pollution**: Transient pollution from sources.
    - [x] **Visual**: Brownish tint (`0x654321`).
    - [x] **Behavior**: Spreads fast, clearing requires source removal + time.
- [x] **River Health (Long-term)**: Accumulating degradation.
    - [x] **Visual**: Deep Green "Algae/Sludge" tint (`0x004400`).
    - [x] **Behavior**: Accumulates slowly when pollution is high (>20%). Recovers very slowly when water is clean (<5%).
    - [x] **Persistence**: Remains even after active pollution cloud passes, simulating sediment/damage.

## HUD Updates
- [x] **Pollution (Active)**: Shows the current average transient pollution.
- [x] **River Health**: Shows `100 - AvgLongTermPollution`. Starts at 100%. Drops as pollution persists.

## Simulation Feedback
- [x] **Observation**: Users can watch "River Health" drop over minutes of gameplay if factories are left unchecked.
- [x] **Recovery**: Remediation (Filters/Stopping Factories) cleans active pollution quickly, but Health recovers at a "natural" slow pace.
