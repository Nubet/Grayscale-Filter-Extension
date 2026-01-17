# Grayscale Everywhere

Firefox extension that applies a customizable grayscale filter to any website.

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
- Firefox Developer Edition (recommended)

### Installation

```bash
bun install
```

### Development (with watch mode)

```bash
bun dev
```

### Production build

```bash
bun run build
```

### Create zip for Firefox webstore 

```bash
bun run zip:firefox
```

This creates a production-ready `.zip` file in `.output/` ready for submission.

### Clean build 

```bash
bun run clean
```

## Temporary Installation

1. Run `bun run build` to build the extension
2. Open Firefox and go to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**, select `manifest.json` from `.output/firefox-mv2/`
4. The extension icon will appear in your toolbar.


## Contributing

Contributions are welcome.

## Links

* Official download: https://addons.mozilla.org/en-US/firefox/addon/grayscale-everywhere/

## License

This project is licensed under the MIT License.
