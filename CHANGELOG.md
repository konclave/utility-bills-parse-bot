# Changelog

## [2.4.0]

### Features

- Added dev server to be able to test webhook callback locally without the Telegram bot.
- Refactored async flow of the message sending to be able to send the message when data is ready, but not all at one time.

### Bug Fixes

- Fixed error handling to be able to see the error message in the debug mode.
