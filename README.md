# Grayscale Everywhere

Cross-browser extension for Chrome and Firefox that applies a customizable grayscale filter to any website.

## Features

* **Customizable Intensity**  
  Adjust the grayscale level from subtle tones to full monochrome via a simple slider.
* **Domain Whitelist**  
  Exclude specific sites or domains to retain their original colors.
* **Zero Data Collection**  
  Fully offline - no tracking, analytics, or external requests.
* **Seamless Injection**  
  Applies CSS at page load for a smooth, unintrusive experience.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- Chrome or Firefox (Developer Edition recommended)

### Installation

```bash
bun install
```

### Development

```bash
bun run dev:chrome
# or
bun run dev:firefox
```

### Production build

```bash
bun run build
```

### Build for both browsers

```bash
bun run build
```

This creates browser-specific production artifacts in `dist/chrome/` and `dist/firefox/`.

### Clean build 

```bash
bun run clean
```

## Temporary Installation

1. Run `bun run build:chrome` or `bun run build:firefox`.
2. For Chrome, open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select `dist/chrome/`.
3. For Firefox, open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on**, and select `dist/firefox/manifest.json`.


## Contributing

Contributions are welcome.

## Links

* Official download: https://addons.mozilla.org/en-US/firefox/addon/grayscale-everywhere/

## License

This project is licensed under the MIT License.
