---
title: "Overview"
nav_order: 1
---

# WebPulse Analytics Developer Documentation

WebPulse is an open-source web analytics tool designed to provide a privacy-focused and customizable alternative to
commercial solutions like Google Analytics. With WebPulse, you can host your own instance or deploy it on Deno Deploy,
ensuring complete control over your analytics data.

This documentation serves as your gateway to setting up your own instance or contributing to the project.

**Key Features:**

- **Open Source:** WebPulse is a community-driven project available under an open-source license. You can contribute,
  modify, and extend it to suit your needs.
- **Privacy-Focused:** We prioritize user privacy by enabling you to collect and analyze data without compromising
  sensitive information.
- **Customizable:** Tailor WebPulse to your specific requirements, thanks to its flexibility and open architecture.
- **Free to Use:** WebPulse is free to use and is showcased at webpulseanalytics.com: https://webpulseanalytics.com
  through simple GitHub authentication.

## How WebPulse Analytics Works

WebPulse Analytics revolves around the concept of Projects, providing a versatile and fine-grained analytics solution:

- **Projects:** Projects represent a sub-level of organization, typically corresponding to subdomains or individual
  domains. Each Project includes an async-loaded tracking script that points to the tracking server, with a unique
  project ID. Projects can be configured to track various metrics, including clicks, scrolls, page views, and unique
  visitors.
- **Tracking Scripts:** Each web page includes an async-loaded tracking script, which points to the tracking server and
  includes the Project ID. This script collects data on user interactions and page views, which is sent to the tracking
  server for analysis.
- **Statistics:** The analytics data collected can be viewed and analyzed either per Project or per Realm, allowing you
  to drill down into specific domains or gain a holistic perspective of your web ecosystem.
- **Self-Hosting:** You have the option to host your own tracking server, giving you complete control over your
  analytics infrastructure and data.
- **Public Showcase:** Alternatively, you can use the public showcase at webpulseanalytics.com:
  https://webpulseanalytics.com through simple GitHub authentication. This provides an easy way to get started and
  showcase your web analytics data to the public.

## Explore WebPulse

To get started with WebPulse Analytics, visit our GitHub repository: https://github.com/pinta365/webpulsebackend, where
you can find the project's README, source code, and contribute to its development.

This documentation is a work in progress, and we are actively adding more information about how WebPulse works, how you
can contribute, and how to get the most out of this powerful web analytics tool. We invite you to join our community and
help us shape the future of web analytics.

Thank you for your interest in WebPulse Analytics! We look forward to collaborating with you.
