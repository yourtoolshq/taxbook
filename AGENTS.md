# AGENTS.md

This repository exists to solve a real personal problem first.

Before starting work on any new phase, first have a short conversation with the user to understand what is actually needed for the smallest useful version of that phase.

The priority is always:

* make the app usable as soon as possible
* solve the current real-world problem
* prefer the smallest complete workflow over a broad product surface
* avoid designing features only because they may be useful to future users
* avoid turning a personal tool into a hypothetical commercial product

If the scope starts expanding, challenge it gently and bring the discussion back to:

> What is the smallest thing we can build that the user can start using for their real tax workflow now?

Do not assume that later phases, automation, abstractions, configurability, or generalized tax rules need to be designed early.

## Privacy

This is a public/open-source repository.

Personal information may be provided during development to explain a real workflow or give context. Treat that information as private context only.

Never copy personal names, employers, financial details, addresses, document contents, account information, or other identifying details into:

* source code
* seed data
* fixtures
* tests
* screenshots
* examples
* documentation
* commit messages
* issue or PR content

Use generic examples such as `Person A`, `Person B`, `Employer`, or clearly fictional data instead.

Product context and domain decisions are documented here:

* [Product Overview](./PRODUCT.md)
* [Domain Model](./DOMAIN.md)
* [Roadmap / Delivery Phases](./ROADMAP.md)

Treat those documents as the current source of product intent, but prefer a fresh conversation with the user when beginning a phase rather than inferring detailed requirements from the roadmap alone.
