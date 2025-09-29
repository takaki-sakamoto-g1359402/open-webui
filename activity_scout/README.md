# ActivityScout

ActivityScout is a tiny Ruby CLI that suggests quick activities using the [Bored API](https://www.boredapi.com/).
It supports fetching a random activity or filtering suggestions by type.

## Requirements

- Ruby 3.3.x
- Bundler

## Setup

```bash
bin/setup
```

## Usage

Fetch a random activity:

```bash
bundle exec ruby bin/activity_scout random
```

Fetch an activity by type (for example, `education`):

```bash
bundle exec ruby bin/activity_scout type education
```

Show the built-in help message:

```bash
bundle exec ruby bin/activity_scout help
```

## Testing

```bash
bundle exec rspec
```
