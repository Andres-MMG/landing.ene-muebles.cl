# Delta for Admin Site Setting

## ADDED Requirements

### Frontend Requirements

### Requirement: Settings form

`/admin/ajustes` MUST provide one form for `brandName`, `tagline`, `contactEmail`, `contactPhone`, `address`, separate Instagram, Facebook, and LinkedIn URLs, `heroTitle`, `heroSubtitle`, and `footerCopy`, with one `Guardar ajustes` submit button.

#### Scenario: Page loads current values
- GIVEN the site-setting singleton exists
- WHEN the admin visits `/admin/ajustes`
- THEN the form is pre-filled from `GET /api/site-setting?populate=*`

#### Scenario: Save updates Strapi
- GIVEN all entered values are valid
- WHEN the admin clicks `Guardar ajustes`
- THEN `PUT /api/site-setting` is called and a success banner is shown
- AND the public catalog receives the change on its next request

#### Scenario: Validation error
- GIVEN `contactEmail` is invalid
- WHEN the form is submitted
- THEN the API returns 400
- AND an inline error appears beside `contactEmail`

### Backend Requirements

### Requirement: Singleton update endpoint

The settings API MUST validate submitted values and MUST update the Strapi `site-setting` singleton without requiring a document ID.

#### Scenario: Singleton endpoint persists valid settings
- GIVEN a valid settings payload
- WHEN `PUT /api/site-setting` is processed
- THEN the singleton is updated and the saved values are returned
