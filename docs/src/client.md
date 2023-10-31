---
title: "Client Setup"
nav_order: 4
---

# Configuring a website to be tracked by WebPulse

This section of the documentation covers how to set up WebPulse Analytics on your website.

### Add a Project

To use WebPulse Analytics, you'll need to create a project in the WebPulse Analytics dashboard. A project represents a
sub-level of organization, typically corresponding to subdomains or individual domains.

### Connect the Site

To connect your website to the WebPulse Analytics tracker, you'll need to add a tracking script to your web pages. This
script collects data on user interactions and page views, which is sent to the tracking server for analysis. Follow
these steps:

1. Create a Project for your website within the WebPulse Analytics dashboard.

2. Once you've created a Project, you will receive a unique Project ID. You'll use this ID in your tracking script.

3. In the HTML of your web pages, locate the `<head></head>` section and add the following line:

   ```html
   <script async src="https://your.server/client/<project-id>" type="module"></script>
   ```

   Replace `your.server` with the URL of your tracking server and `<project-id>` with the unique Project ID you received
   in step 2.

### Full Page Example

Here's a full HTML page example that includes the WebPulse Analytics tracking script:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <script async src="https://your.server/client/<project-id>" type="module"></script>

    <title>Your Page Title</title>
</head>
<body>
   </body>
</html>
```
