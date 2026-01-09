# Simulation Mode Verification Checklist

## Interactive Controls
- [x] **Factory Controls**: Clicking a factory opens the Inspector.
    - [x] **OFF Button**: Sets pollution output to 0%. Button highlights when active.
    - [x] **LO Button**: Sets pollution output to ~20%.
    - [x] **HI Button**: Sets pollution output to 100% (High).
    - [x] **Inspector UI**: Updates dynamically to show current output percentage.
- [x] **Filter Controls**: Clicking a filter opens the Inspector.
    - [x] **Toggle Button**: Text switches between "Active" and "Inactive". Color changes (Green/Red).
- [x] **Event Handling**: Clicking UI buttons *does not* propagate to the map (doesn't trigger movement or placement).

## Simulation Feedback
- [x] **Visuals**: Pollution spreads visibly from factories when active.
- [x] **Fish Behavior**:
    - [x] Fish swim normally (speed ~0.08) in clean water.
    - [x] Fish slow down significanty (speed -> 0.02) when in polluted water.
    - [x] Fish take damage in pollution and eventually die (turn gray, float to top).
    - [x] Fish recover health slightly if they escape to clean water.
- [x] **HUD**: Displays average pollution % and live fish count.

## Stability
- [x] **Performance**: Removed redundant fish spawning to ensure smooth frame rate.
- [x] **Error Handling**: Button generation handles missing events safely.
