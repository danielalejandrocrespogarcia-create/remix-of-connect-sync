# Exportar UPT Aragua a Android Studio

La carpeta `android/` ya viene incluida en el proyecto.

## Requisitos
- Bun (o Node 20+)
- Android Studio con Android SDK y JDK 21

## Pasos (terminal de Visual Studio Code)

```bash
bun install
bun run build:android     # compila la app y la copia dentro de android/
bunx cap open android     # abre Android Studio
```

En Android Studio: espera a que termine "Gradle Sync" y luego
**Build > Build App Bundle(s) / APK(s) > Build APK(s)**.

`build:android` (scripts/build-android.mjs) funciona en Windows, macOS y Linux:
compila en modo Capacitor (rutas con `#/` para que no queden pantallas en blanco),
crea la plataforma Android si faltara, y ejecuta `cap sync android`.

Cada vez que cambies el código:

```bash
bun run build:android
```
