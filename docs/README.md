# Fortnite Sens Lab Pro v3.4

Herramienta web para calibrar la sensibilidad ideal de mouse en Fortnite mediante un algoritmo híbrido determinista.

## 🎯 Características

- **Algoritmo híbrido**: Combina búsqueda binaria con interpolación cuadrática
- **Scoring dinámico**: Ponderación según estilo de juego (shotgun/AR/balanceado)
- **Movimiento realista**: Delta time real con física de agente
- **Perfil personalizado**: ADS y Scope calculados automáticamente
- **Modo afinado**: 3 rondas adicionales para refinar resultados

## 🎮 Cómo usar

1. Abre `index.html` en tu navegador (Chrome/Firefox recomendado)
2. Configura tu DPI, peso del mouse, agarre y estilo de juego
3. Haz clic en "Comenzar Test Completo"
4. Sigue el punto rojo durante 25s, luego haz clic en los targets amarillos
5. Repite para 5 rondas totales
6. Obtén tu sensibilidad óptima con configuración completa para Fortnite

## ⚙️ Configuración recomendada

- **DPI**: Usa el valor nominal de tu mouse (ej: 800)
- **Peso**: Mide con balanza si no estás seguro
- **Agarre**: Fingertip/Claw/Palm según tu técnica
- **Estilo**: Shotgun (rápido), AR (preciso) o Balanceado

## 📊 Interpretación de resultados

- **Score >80**: Excelente rendimiento con esa sensibilidad
- **Score 60-80**: Rendimiento bueno
- **Score <60**: Sensibilidad no óptima para tu estilo

## 🛠️ Tecnología

- Vanilla JavaScript (ES6+)
- HTML5 Canvas API
- Pointer Lock API para captura de mouse
- Local Storage para guardado de datos

## 📄 Licencia

  ## 📜 License

This project is **dual-licensed**:

- 🆓 **GPL v3** — for open source, non-commercial, or GPL-compatible use. 
  See [LICENSE-GPL.txt](./LICENSE-GPL.txt).
- 💼 **Commercial License** — for proprietary or commercial use without 
  GPL obligations. See [COMMERCIAL-LICENSE.md](./COMMERCIAL-LICENSE.md).

By default, GPL-3.0 applies. For commercial licensing inquiries, 
please [open an issue](https://github.com/EspiLegends/fortnite-sens-lab/issues) 
or contact the author.

## 🐛 Reportar bugs



## 🔄 Changelog

- **v3.4**: Movimiento con delta time real, bugfixes críticos
- **v3.3**: Scoring dinámico por estilo de juego
- **v3.2**: Interpolación cuadrática en modo afinado
