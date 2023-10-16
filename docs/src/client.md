---
title: "Client Setup"
nav_order: 2
---

## Client configuration

To connect a web site to your tracker, set up a new realm and project, and append this line between `<head></head>`-tags:

```html
<script async src="https://track.webpulseanalytics.com/client/<project-id>" type="module"></script>
```

### Full page example

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script async src="https://track.webpulseanalytics.com/client/<project-id>" type="module"></script>
    <title></title>
</head>
<body>
   Page content
</body>
</html>
```