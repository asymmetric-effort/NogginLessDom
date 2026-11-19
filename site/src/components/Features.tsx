import { createElement } from '@asymmetric-effort/specifyjs';

interface FeatureCardProps {
  title: string;
  description: string;
}

function FeatureCard(
  props: FeatureCardProps,
): ReturnType<typeof createElement> {
  return createElement(
    'div',
    {
      style: {
        flex: '1',
        minWidth: '250px',
        padding: '16px 20px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '6px',
        border: '1px solid var(--border)',
      },
    },
    createElement(
      'h3',
      {
        style: {
          color: 'var(--text-primary)',
          marginBottom: '0.5rem',
          fontSize: '1.1rem',
        },
      },
      props.title,
    ),
    createElement(
      'p',
      {
        style: {
          color: 'var(--text-muted)',
          lineHeight: '1.5',
          fontSize: '0.9rem',
          margin: '0',
        },
      },
      props.description,
    ),
  );
}

export function Features(): ReturnType<typeof createElement> {
  const features: FeatureCardProps[] = [
    {
      title: 'Zero Dependencies',
      description:
        'No third-party runtime dependencies. Every algorithm implemented from scratch using only Node.js built-in modules. 31K+ lines of pure TypeScript.',
    },
    {
      title: '30+ Assertion Matchers',
      description:
        'Full-featured expect API with toBe, toEqual, toThrow, toContain, toMatch, toHaveProperty, toMatchSnapshot, and many more. Supports .not, .resolves, and .rejects chains.',
    },
    {
      title: '23+ Typed HTML Elements',
      description:
        'Complete DOM simulation with typed elements: HTMLDivElement, HTMLInputElement, HTMLFormElement, HTMLAnchorElement, and more. Full querySelector, classList, and event support.',
    },
    {
      title: 'Complete Mocking (vi Namespace)',
      description:
        'Full mocking system with vi.fn(), vi.spyOn(), vi.mock(), vi.useFakeTimers(), vi.advanceTimersByTime(), and more. Drop-in compatible mock API.',
    },
    {
      title: 'Snapshot Testing',
      description:
        'Built-in snapshot testing with toMatchSnapshot() and toMatchInlineSnapshot(). Supports custom serializers for fine-grained control.',
    },
    {
      title: 'Code Coverage',
      description:
        'Integrated V8 and Istanbul coverage with 12 reporters. Track statement, branch, function, and line coverage across your entire test suite.',
    },
    {
      title: 'Supply Chain Security',
      description:
        'Eliminates the supply chain attack surface entirely. No node_modules to audit beyond dev tooling. Zero npm vulnerabilities.',
    },
    {
      title: 'Built on node:test',
      description:
        'Wraps the Node.js built-in test runner and assertion library. Stable, maintained, zero-install foundation.',
    },
    {
      title: 'TypeScript First',
      description:
        'Written in strict TypeScript with full type declarations. 58 source files with 2,156 tests ensuring rock-solid reliability.',
    },
  ];

  return createElement(
    'section',
    {
      style: {
        padding: '3rem 20px',
        backgroundColor: 'var(--bg-primary)',
      },
    },
    createElement(
      'h2',
      {
        style: {
          textAlign: 'center',
          color: 'var(--text-primary)',
          marginBottom: '2rem',
          fontSize: '1.5rem',
        },
      },
      'Why NogginLessDom?',
    ),
    createElement(
      'div',
      {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          maxWidth: '900px',
          margin: '0 auto',
        },
      },
      ...features.map((f) => createElement(FeatureCard, f)),
    ),
  );
}
