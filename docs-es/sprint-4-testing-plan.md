# Sprint 4 Testing Plan

Updated: August 1, 2026

This document summarizes the testing work kept in the repository for the Sprint 4 features assigned to Omar. The goal is not to list every possible scenario, but to leave a clear record of what was validated, what still matters most, and how the team can retest the application if changes are made later.

## Features covered

- `PROG-04` Filter progress history
- `TST-01` Create a testing plan for Career Forge
- `TST-02` Test user registration and login
- `TST-11` Usability testing for the final product flow
- `TST-12` Retest fixed bugs before submission

## What we tested

### Authentication

We verified the login and registration flow from the user perspective. That includes:

- registration rejects mismatched passwords
- registration rejects incomplete required fields
- registration submits the expected payload when the form is valid
- login trims and submits credentials correctly
- login shows API errors instead of redirecting on failure

This matters because authentication is the entry point for most of the application. If this flow fails, the rest of the product becomes inaccessible.

### Progress dashboard

We tested the progress area after the refactor that moved filtering logic into the new client-side history view.

Covered behavior:

- CV history can be filtered by profile
- quiz history can be filtered by job type
- application history responds to the active filters
- filtered empty states are shown when nothing matches
- existing progress sections still render correctly for the signed-in user

This is especially important because the page combines data from several modules and can break in subtle ways if one part changes shape.

### Header and navigation regression

We also kept regression checks around the navigation because the header changed multiple times during Sprint 3 and Sprint 4.

Covered behavior:

- authenticated users still see the private navigation
- notifications remain accessible
- admin-only options remain separated from normal user options

## Manual checks we still consider important

Automated tests cover a lot, but these are still worth checking manually before a final delivery:

- login, register, and redirect behavior in the browser
- progress filters on desktop and mobile widths
- notification access from the header
- support/ticket access from the user side
- job listings search and pagination flow

## Regression focus

If the team changes related code later, these are the first areas worth retesting:

- auth routes and auth form validation
- progress page data flow
- header navigation and role-based menus
- profile actions tied to professional CV profiles
- job listings integration with live data and fallback behavior

## Repository note

The test files, helpers, and test plan should remain in the repository. They are part of the project’s maintainability and also serve as proof that the team validated core functionality instead of only demonstrating the happy path.

What should stay in the repo:

- unit and integration tests
- test helpers and fixtures that are actually used
- configuration for the test runner
- concise testing notes like this one

What does not need to stay:

- temporary outputs
- local logs
- generated debug artifacts
- machine-specific scratch files

## Exit criteria used for this sprint

Before closing the Sprint 4 work, the target was:

- `npm run test` passes
- `npm run lint` passes
- `npm run build` passes
- the main user flows still work after the refactor

That gives the team a practical baseline for future updates without turning testing into unnecessary paperwork.
