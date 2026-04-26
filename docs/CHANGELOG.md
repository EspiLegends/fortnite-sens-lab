# Changelog

## [3.4] - 2025-01-06
### Fixed
- Movimiento errático con aceleración infinita (corregido a delta time real)
- Bug en tabla de progreso que saltaba rondas
- Target no cambiaba de color en tracking
- Congelamiento en fase de flicks

### Changed
- Velocidad de target ahora constante (180 px/s) con física realista
- Reducción de jitter para mejor discriminación de sensibilidad

## [3.3] - 2025-01-05
### Added
- Scoring dinámico según estilo de juego (shotgun/ar/balanced)
- Velocidad de flicks afecta el score
- Mejor cálculo de ADS/Scope basado en balance real

## [3.2] - 2025-01-04
### Added
- Interpolación cuadrática en modo afinado para convergencia más rápida
- Función quadraticPeak() para encontrar máximos de parábola