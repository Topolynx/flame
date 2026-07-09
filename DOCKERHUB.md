# Flame

Lightweight self-hosted startpage for apps, bookmarks, search and Docker-discovered services.

This image is published from a maintained fork of [pawelmalak/flame](https://github.com/pawelmalak/flame), originally created by Paweł Malak and distributed under the MIT License.

## Preview

![Homescreen screenshot](https://raw.githubusercontent.com/Topolynx/flame/master/.github/home.png)

![Apps screenshot](https://raw.githubusercontent.com/Topolynx/flame/master/.github/apps.png)

![Bookmark icon picker screenshot](https://raw.githubusercontent.com/Topolynx/flame/master/.github/bookmark-icon-feature.png)

![Settings screenshot](https://raw.githubusercontent.com/Topolynx/flame/master/.github/settings.png)

## Tags

- `luciobt/flame:2.5.0`
- `luciobt/flame:latest`

## Quick Start

```sh
docker run -d \
  --name flame \
  --restart unless-stopped \
  -p 5005:5005 \
  -v /path/to/data:/app/data \
  -e PASSWORD=change_me \
  luciobt/flame:2.5.0
```

With Docker discovery:

```sh
docker run -d \
  --name flame \
  --restart unless-stopped \
  -p 5005:5005 \
  -v /path/to/data:/app/data \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -e PASSWORD=change_me \
  luciobt/flame:2.5.0
```

## Docker Compose

```yaml
services:
  flame:
    image: luciobt/flame:2.5.0
    container_name: flame
    restart: unless-stopped
    ports:
      - 5005:5005
    volumes:
      - /path/to/data:/app/data
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      PASSWORD: change_me
```

## What's New In This Fork

- Frontend build migrated from Create React App to Vite.
- Runtime dependencies refreshed conservatively.
- Kubernetes discovery is optional to keep the default install lighter.
- Uploaded SVG icons render directly without `external-svg-loader`.
- New Settings > Icons page to view, upload, rename and delete uploaded icons.
- App and bookmark forms can select icons already present in `data/uploads`.
- Uploaded icon filenames are preserved with safer upload validation.
- Dockerfiles no longer bake a default password into the image.

## Docker Labels

Containers can appear automatically in Flame by adding labels:

```yaml
labels:
  - flame.type=application
  - flame.name=My App
  - flame.url=http://localhost:8080
  - flame.icon=docker
```

## Links

- GitHub: https://github.com/Topolynx/flame
- Release: https://github.com/Topolynx/flame/releases/tag/v2.5.0-topolynx.1
- Original project: https://github.com/pawelmalak/flame

## License

MIT. Original copyright notice is preserved in `LICENSE.md`; fork notices are documented in `NOTICE.md`.
