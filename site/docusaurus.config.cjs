const fs = require('node:fs')
const path = require('node:path')
const matter = require('gray-matter')

const baseUrlFromEnv = process.env.DOCS_BASE_URL || '/'
const baseUrl = baseUrlFromEnv.startsWith('/')
  ? baseUrlFromEnv
  : `/${baseUrlFromEnv}`
const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`

const repository = process.env.GITHUB_REPOSITORY || 'DEFRA/example-service'
const service = repository.split('/').pop()
const repoUrl = `https://github.com/${repository}`

const specPath = path.join(__dirname, 'openapi/swagger.json')
const hasSpec = fs.existsSync(specPath)
const spec = hasSpec ? JSON.parse(fs.readFileSync(specPath, 'utf8')) : null

const kebabCase = require(
  require.resolve('lodash/kebabCase', {
    paths: [require.resolve('docusaurus-plugin-openapi-docs')]
  })
)

const titleFromServiceName = (name) =>
  name
    .split('-')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')

const routeFromGuidePath = (relativePath) => {
  const withoutExt = relativePath.replace(/\.mdx?$/i, '')
  const withoutIndex = withoutExt.replace(/(^|\/)index$/i, '')
  return withoutIndex ? `/${withoutIndex}/` : '/'
}

const guidesDir = path.join(__dirname, 'guides')
const walkGuides = (dir) => {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) return walkGuides(fullPath)
    return /\.mdx?$/i.test(entry.name) ? [fullPath] : []
  })
}

// Site-wide settings (site_title, site_tagline, phase) live in the front
// matter of the home page: the guide with `slug: /`, or the top-level index.
const readSiteSettings = () => {
  const guides = walkGuides(guidesDir).map((absolutePath) => ({
    relativePath: path.relative(guidesDir, absolutePath).replace(/\\/g, '/'),
    data: matter(fs.readFileSync(absolutePath, 'utf8')).data
  }))
  const home =
    guides.find(({ data }) => data.slug === '/') ||
    guides.find(({ relativePath }) => /^index\.mdx?$/i.test(relativePath))
  return home?.data ?? {}
}

const settings = readSiteSettings()
const siteTitle = settings.site_title || titleFromServiceName(service)
const phase = settings.phase || 'beta'
const siteTagline =
  settings.site_tagline ||
  spec?.info?.title ||
  `API documentation for ${titleFromServiceName(service)}`

const guideLinks = () => {
  const files = walkGuides(guidesDir)
  const links = files.map((absolutePath) => {
    const relativePath = path.relative(guidesDir, absolutePath).replace(/\\/g, '/')
    const source = fs.readFileSync(absolutePath, 'utf8')
    const { data } = matter(source)
    const href = data.slug || routeFromGuidePath(relativePath)
    const basename = path.basename(relativePath).replace(/\.mdx?$/i, '')
    return {
      text: data.sidebar_label || data.title || titleFromServiceName(basename),
      href,
      position:
        typeof data.sidebar_position === 'number'
          ? data.sidebar_position
          : href === '/'
            ? -1
            : Number.MAX_SAFE_INTEGER
    }
  })

  return links
    .sort(
      (a, b) =>
        a.position - b.position ||
        a.text.localeCompare(b.text, 'en', { sensitivity: 'base' })
    )
    .map(({ text, href }) => ({ text, href }))
}

// The GOV.UK theme sidebar allows one level of nesting, so each tag becomes a
// group and untagged operations stay top level. Order follows the spec.
const apiReferenceLinks = () => {
  if (!spec?.paths) return []
  const links = []
  const groups = new Map()

  Object.entries(spec.paths).forEach(([route, methods]) => {
    Object.entries(methods).forEach(([method, operation]) => {
      const operationId =
        operation?.operationId || `${method.toLowerCase()}-${route}`
      const link = {
        text: operation?.summary || `${method.toUpperCase()} ${route}`,
        href: `/api/reference/${kebabCase(operationId)}/`
      }
      const tag = operation?.tags?.[0]
      if (!tag) {
        links.push(link)
        return
      }
      if (!groups.has(tag)) {
        const group = { text: tag, href: link.href, items: [] }
        groups.set(tag, group)
        links.push(group)
      }
      groups.get(tag).items.push(link)
    })
  })

  return links
}

const docsNavigation = guideLinks()
const firstGuideHref = docsNavigation.find(({ href }) => href !== '/')?.href || '/'

const themes = [
  [
    require.resolve('@easyops-cn/docusaurus-search-local'),
    {
      docsRouteBasePath: '/',
      indexBlog: false,
      indexPages: false,
      hashed: 'filename',
      highlightSearchTermsOnTargetPage: true,
      searchResultContextMaxLength: 60
    }
  ],
  '@defra/docusaurus-theme-govuk',
  require.resolve('./src/plugins/fix-govuk-nav-base-url.cjs')
]

if (hasSpec) {
  themes.splice(2, 0, 'docusaurus-theme-openapi-docs')
  themes.splice(3, 0, require.resolve('./src/plugins/scope-govuk-sass.cjs'))
}

const plugins = []
if (hasSpec) {
  plugins.push(
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'api',
        docsPluginId: 'api',
        config: {
          service: {
            specPath: 'openapi/swagger.json',
            outputDir: 'docs/api/reference',
            template: 'templates/api-page.mustache',
            hideSendButton: true,
            sidebarOptions: {
              groupPathsBy: 'tag'
            }
          }
        }
      }
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'api',
        path: 'docs/api/reference',
        routeBasePath: 'api/reference',
        sidebarPath: require.resolve('./sidebarsApi.js'),
        docItemComponent: '@theme/ApiItem'
      }
    ]
  )
}

/** @type {import('@docusaurus/types').Config} */
module.exports = {
  title: siteTitle,
  tagline: siteTagline,
  favicon: 'img/favicon.ico',

  url: 'https://cdp-int.defra.cloud',
  baseUrl: normalizedBaseUrl,
  trailingSlash: true,

  onBrokenLinks: 'throw',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn'
    }
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en']
  },

  themes,

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'guides',
          routeBasePath: '/',
          sidebarPath: require.resolve('./sidebars.js'),
          onInlineTags: 'ignore'
        },
        blog: false,
        pages: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      }
    ]
  ],

  plugins,

  themeConfig: {
    colorMode: {
      defaultMode: 'light',
      disableSwitch: true,
      respectPrefersColorScheme: false
    },
    docs: {
      versionPersistence: 'localStorage'
    },
    govuk: {
      header: {
        serviceName: siteTitle,
        serviceHref: '/',
        organisationText: 'DEFRA',
        organisationHref:
          'https://www.gov.uk/government/organisations/department-for-environment-food-rural-affairs'
      },
      navigation: [
        {
          text: 'Documentation',
          href: '/',
          sidebar: docsNavigation
        },
        ...(hasSpec
          ? [
              {
                text: 'API Reference',
                href: '/api/reference/',
                sidebar: [
                  { text: 'Overview', href: '/api/reference/' },
                  ...apiReferenceLinks()
                ]
              }
            ]
          : [])
      ],
      // GOV.UK shows a phase banner only for alpha and beta, not live.
      // The theme appends a link with the text "feedback" after `text`.
      phaseBanner:
        phase === 'live'
          ? undefined
          : {
              phase,
              text: 'This documentation is new. Help us improve it – give your',
              feedbackHref: `${repoUrl}/issues`
            },
      footer: {
        meta: [
          { text: service, href: repoUrl },
          { text: 'cdp-api-docs', href: 'https://github.com/DEFRA/cdp-api-docs' }
        ]
      },
      homepage: {
        getStartedHref: firstGuideHref,
        description:
          spec?.info?.description || `Documentation for ${titleFromServiceName(service)}.`
      }
    }
  }
}
