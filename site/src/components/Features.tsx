import { createElement } from '@asymmetric-effort/specifyjs';

interface FeatureCardProps {
  title: string;
  description: string;
}

function FeatureCard(props: FeatureCardProps): ReturnType<typeof createElement> {
  return createElement(
    'div',
    {
      style: {
        flex: '1',
        minWidth: '250px',
        padding: '2rem',
        backgroundColor: '#1a1a2e',
        borderRadius: '8px',
        border: '1px solid #2a2a3e',
      },
    },
    createElement(
      'h3',
      { style: { color: '#00d4aa', marginBottom: '0.75rem', fontSize: '1.1rem' } },
      props.title,
    ),
    createElement(
      'p',
      { style: { color: '#aaa', lineHeight: '1.5', fontSize: '0.9rem' } },
      props.description,
    ),
  );
}

export function Features(): ReturnType<typeof createElement> {
  const features: FeatureCardProps[] = [
    {
      title: 'Zero Dependencies',
      description:
        'No third-party runtime dependencies. Every algorithm implemented from scratch using only Node.js built-in modules.',
    },
    {
      title: 'Vitest Parity',
      description:
        'Drop-in replacement API. describe, it, expect with 20+ matchers, mocking, spies, and fake timers.',
    },
    {
      title: 'DOM Simulation',
      description:
        'Full DOM environment without jsdom. Document, Element, Node, Event classes for testing UI code.',
    },
    {
      title: 'Supply Chain Security',
      description:
        'Eliminates the supply chain attack surface entirely. No node_modules to audit beyond dev tooling.',
    },
    {
      title: 'Built on node:test',
      description:
        'Wraps the Node.js built-in test runner and assertion library. Stable, maintained, zero-install foundation.',
    },
    {
      title: 'TypeScript First',
      description:
        'Written in strict TypeScript with full type declarations. First-class IDE support and type safety.',
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
      'Why NogginLessDom?',
    ),
    createElement(
      'div',
      {
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
          maxWidth: '960px',
          margin: '0 auto',
        },
      },
      ...features.map((f) => createElement(FeatureCard, f)),
    ),
  );
}
