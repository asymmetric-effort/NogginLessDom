import { createElement } from '@asymmetric-effort/specifyjs';

interface ModuleInfo {
  name: string;
  hash: string;
  items: string[];
}

export function ApiOverview(): ReturnType<typeof createElement> {
  const modules: ModuleInfo[] = [
    {
      name: 'Test Runner',
      hash: '#/api/test-runner',
      items: [
        'describe',
        'it / test',
        'beforeEach',
        'afterEach',
        'beforeAll',
        'afterAll',
        'skip',
        'only',
        'todo',
        'nested suites',
      ],
    },
    {
      name: 'Assertions (30+ matchers)',
      hash: '#/api/assertions',
      items: [
        'expect().toBe()',
        'expect().toEqual()',
        'expect().toThrow()',
        'expect().toContain()',
        'expect().toMatch()',
        'expect().toHaveProperty()',
        'expect().toMatchSnapshot()',
        'expect().not / .resolves / .rejects',
        '30+ matchers total',
      ],
    },
    {
      name: 'DOM (23+ typed elements)',
      hash: '#/api/dom',
      items: [
        'Document',
        'HTMLDivElement',
        'HTMLInputElement',
        'HTMLFormElement',
        'HTMLAnchorElement',
        'Event / CustomEvent',
        'querySelector / querySelectorAll',
        'classList / attributes',
        '23+ typed HTML elements',
      ],
    },
    {
      name: 'Mocking (vi namespace)',
      hash: '#/api/mocking',
      items: [
        'vi.fn()',
        'vi.spyOn()',
        'vi.mock()',
        'vi.useFakeTimers()',
        'vi.advanceTimersByTime()',
        'mockReturnValue / mockResolvedValue',
        'mock.calls / mock.results',
      ],
    },
    {
      name: 'Snapshot Testing',
      hash: '#/api/assertions',
      items: [
        'toMatchSnapshot()',
        'toMatchInlineSnapshot()',
        'Custom serializers',
        'Snapshot update mode',
      ],
    },
    {
      name: 'Code Coverage',
      hash: '#/api/test-runner',
      items: [
        'V8 coverage provider',
        'Istanbul coverage provider',
        '12 reporter formats',
        'Statement / branch / function / line',
        'Coverage thresholds',
      ],
    },
  ];

  return createElement(
    'section',
    {
      style: {
        padding: '4rem 2rem',
        backgroundColor: 'var(--bg-primary)',
        fontFamily: 'system-ui, sans-serif',
      },
    },
    createElement(
      'h2',
      {
        style: {
          textAlign: 'center',
          color: 'var(--text-primary)',
          marginBottom: '2rem',
          fontSize: '2rem',
        },
      },
      'API at a Glance',
    ),
    createElement(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.5rem',
          maxWidth: '960px',
          margin: '0 auto',
        },
      },
      ...modules.map((mod) =>
        createElement(
          'div',
          {
            style: {
              padding: '1.5rem',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border)',
            },
          },
          createElement(
            'a',
            {
              href: mod.hash,
              style: {
                color: 'var(--accent)',
                textDecoration: 'none',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                display: 'block',
                marginBottom: '0.75rem',
              },
            },
            mod.name,
          ),
          createElement(
            'ul',
            {
              style: {
                listStyle: 'none',
                padding: '0',
                margin: '0',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem',
              },
            },
            ...mod.items.map((item) =>
              createElement(
                'li',
                {
                  style: {
                    color: 'var(--text-muted)',
                    fontSize: '0.85rem',
                    fontFamily: 'monospace',
                  },
                },
                item,
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
