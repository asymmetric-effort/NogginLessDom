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
      items: ['describe', 'it / test', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll', 'skip', 'only', 'todo'],
    },
    {
      name: 'Assertions',
      hash: '#/api/assertions',
      items: [
        'expect().toBe()',
        'expect().toEqual()',
        'expect().toThrow()',
        'expect().toContain()',
        'expect().not',
        'expect().resolves',
        '20+ matchers',
      ],
    },
    {
      name: 'DOM',
      hash: '#/api/dom',
      items: ['Document', 'Element', 'Node', 'TextNode', 'Event', 'querySelector', 'classList', 'attributes'],
    },
    {
      name: 'Mocking',
      hash: '#/api/mocking',
      items: ['fn()', 'spyOn()', 'mockReturnValue', 'useFakeTimers', 'advanceTimersByTime', 'mock.calls'],
    },
  ];

  return createElement(
    'section',
    {
      style: {
        padding: '4rem 2rem',
        backgroundColor: '#0d0d1a',
        fontFamily: 'system-ui, sans-serif',
      },
    },
    createElement(
      'h2',
      { style: { textAlign: 'center', color: '#fff', marginBottom: '2rem', fontSize: '2rem' } },
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
              backgroundColor: '#1a1a2e',
              borderRadius: '8px',
              border: '1px solid #2a2a3e',
            },
          },
          createElement(
            'a',
            {
              href: mod.hash,
              style: {
                color: '#00d4aa',
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
                    color: '#aaa',
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
