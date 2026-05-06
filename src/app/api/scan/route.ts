import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { engine, query, categories } = body;

    // Read portals config from user settings
    const portalsSetting = await db.setting.findUnique({
      where: { userId_key: { userId: user.id, key: 'portals' } }
    });
    const portalsConfig = portalsSetting?.value || '';

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    // Default search categories if none specified
    const searchCategories =
      categories && Array.isArray(categories) && categories.length > 0
        ? categories
        : [
            {
              name: 'AI/ML Engineering',
              query:
                'site:greenhouse.io OR site:ashbyhq.com OR site:lever.co Senior AI Engineer OR ML Engineer OR Machine Learning Engineer 2025',
            },
            {
              name: 'Software Engineering',
              query:
                'site:greenhouse.io OR site:ashbyhq.com OR site:lever.co Senior Software Engineer OR Staff Engineer remote 2025',
            },
            {
              name: 'Product & Solutions',
              query:
                'site:greenhouse.io OR site:ashbyhq.com OR site:lever.co Product Manager OR Solutions Architect OR Forward Deployed Engineer 2025',
            },
            {
              name: 'Data Engineering',
              query:
                'site:greenhouse.io OR site:ashbyhq.com OR site:lever.co Data Engineer OR Data Platform Engineer OR Analytics Engineer 2025',
            },
          ];

    // If user provided a custom query, use that instead of categories
    if (query) {
      searchCategories.length = 0;
      searchCategories.push({ name: 'Custom Search', query });
    }

    // Parse portals config to add site: filters
    let siteFilters = '';
    if (portalsConfig) {
      try {
        const portals = JSON.parse(portalsConfig);
        if (Array.isArray(portals)) {
          const sites = portals
            .filter((p: string) => typeof p === 'string' && p.trim())
            .map((p: string) => {
              // Extract domain from URL if full URL provided
              try {
                const url = new URL(p.startsWith('http') ? p : `https://${p}`);
                return `site:${url.hostname}`;
              } catch {
                return `site:${p}`;
              }
            });
          if (sites.length > 0) {
            siteFilters = sites.join(' OR ');
          }
        }
      } catch {
        // If not valid JSON, treat as plain text
        if (portalsConfig.trim()) {
          const sites = portalsConfig
            .split(/[,;\n]/)
            .map((s: string) => s.trim())
            .filter((s: string) => s)
            .map((s: string) => {
              try {
                const url = new URL(s.startsWith('http') ? s : `https://${s}`);
                return `site:${url.hostname}`;
              } catch {
                return `site:${s}`;
              }
            });
          if (sites.length > 0) {
            siteFilters = sites.join(' OR ');
          }
        }
      }
    }

    // Read profile to personalize search
    const profileSetting = await db.setting.findUnique({
      where: { userId_key: { userId: user.id, key: 'profile' } }
    });
    let searchPersonalization = '';
    if (profileSetting?.value) {
      // Extract key skills/titles from profile for search personalization
      try {
        const profileText = profileSetting.value;
        const skillMatch = profileText.match(/(?:skills|technologies|expertise)[:\s]*([^\n]+)/i);
        if (skillMatch) {
          searchPersonalization = skillMatch[1].trim();
        }
      } catch {
        // Ignore parsing errors
      }
    }

    const allResults: ScanResult[] = [];

    for (const category of searchCategories) {
      try {
        let searchQuery = category.query as string;

        // Prepend custom site filters if available
        if (siteFilters && !searchQuery.includes('site:')) {
          searchQuery = `${siteFilters} ${searchQuery}`;
        } else if (siteFilters) {
          // Replace default site filters with custom ones
          searchQuery = searchQuery.replace(
            /site:\S+(?:\s+OR\s+site:\S+)*/g,
            siteFilters
          );
        }

        // Add personalization
        if (searchPersonalization && !query) {
          searchQuery += ` ${searchPersonalization}`;
        }

        const searchResult = await zai.functions.invoke('web_search', {
          query: searchQuery,
          num: 10,
        });

        const results = (
          searchResult as {
            results?: Array<{
              title?: string;
              snippet?: string;
              url?: string;
            }>;
          }
        ).results || [];

        for (const r of results) {
          // Try to extract company name from title
          let company = 'Unknown';
          const title = r.title || 'Untitled';
          // Common patterns: "Company - Job Title", "Job Title at Company", "Company | Job Title"
          const dashMatch = title.match(/^(.+?)\s*[-–—|]\s*/);
          if (dashMatch) {
            company = dashMatch[1].trim();
          }
          const atMatch = title.match(/\bat\s+(.+?)(?:\s*[-–—|]|\s*$)/i);
          if (atMatch) {
            company = atMatch[1].trim();
          }

          allResults.push({
            title,
            company,
            snippet: r.snippet || '',
            url: r.url || '',
            category: category.name as string,
          });
        }
      } catch (err) {
        console.error(`Error searching category "${category.name}":`, err);
        // Continue with other categories
      }
    }

    // Deduplicate by URL
    const seenUrls = new Set<string>();
    const dedupedResults = allResults.filter((r) => {
      if (!r.url || seenUrls.has(r.url)) return false;
      seenUrls.add(r.url);
      return true;
    });

    return NextResponse.json({
      success: true,
      message: `Scan completed using ${engine || 'GLM'} engine across ${searchCategories.length} categories`,
      results: dedupedResults,
      total: dedupedResults.length,
      categories: searchCategories.map((c) => c.name),
    });
  } catch (error) {
    console.error('Error scanning:', error);
    return NextResponse.json({ error: 'Failed to scan portals' }, { status: 500 });
  }
}
