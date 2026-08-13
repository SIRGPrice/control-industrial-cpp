# C++ Concurrente · Control Industrial

Documentación interactiva sobre **semáforos, colas y programación multihilo en C++**
orientada a ingenieros de control de instalaciones industriales. Incluye teoría,
patrones de diseño y **laboratorios simulados** en los que se ve qué línea de código
produce qué efecto en una planta virtual.

Página web: <https://sirgprice.github.io/control-industrial-cpp/>

## Contenido

- **Fundamentos**: hilos, riesgos de la concurrencia, mutex, variables de condición, atómicos.
- **Semáforos y colas**: teoría, patrones clásicos, colas bloqueantes y paso de mensajes.
- **Patrones**: productor–consumidor, lectores–escritores, barreras y rendezvous, pipelines.
- **Proyecto de planta**: arquitectura, diseño paso a paso y supervisión.
- **Laboratorios** (simuladores interactivos en JavaScript):
  - Célula FMS: prensa, CNC y robot.
  - Línea de envasado (buffer limitado).
  - Línea de mecanizado con colas y supervisor.
- **Referencia**: hoja de referencia, errores comunes, glosario y ejercicios resueltos
  en el estilo clásico de los ejercicios de sistemas de tiempo real (`wait`/`signal`,
  un hilo por dispositivo).

## Tecnología

Sitio estático (HTML, CSS y JavaScript puro, sin compilar), publicado con GitHub Pages
mediante el workflow de `.github/workflows/deploy.yml`. No requiere instalación ni build.

## Desarrollo local

Abre `index.html` en un navegador o sirve la carpeta raíz:

```bash
python -m http.server 8000
```

## Estructura

```
.
├── index.html          # portada
├── docs/               # documentación teórica y de patrones
├── labs/               # páginas de los laboratorios interactivos
├── ref/                # cheatsheet, errores, glosario, ejercicios
├── js/                 # motor de simulación, definición de labs y chrome del sitio
├── css/estilos.css     # sistema de diseño
└── assets/             # favicon
```
