import { Command } from 'commander';
import { output, isJsonMode, handleError } from '../output.js';
import { listPopularSchemas, listPopularSchemasByCategory } from '../popular-schemas.js';

export const popularSchemasCommand = new Command('popular-schemas')
  .description('List popular EAS schemas with names, UIDs, and descriptions')
  .option('--category <name>', 'Filter by category (general, identity, social)')
  .action(async (opts) => {
    try {
      if (isJsonMode()) {
        const schemas = opts.category
          ? listPopularSchemas().filter((s) => s.category === opts.category)
          : listPopularSchemas();
        if (opts.category && schemas.length === 0) {
          const categories = [...new Set(listPopularSchemas().map((s) => s.category))];
          throw new Error(`Unknown category "${opts.category}". Available: ${categories.join(', ')}`);
        }
        output({ success: true, data: { count: schemas.length, schemas } as any });
        return;
      }

      const byCategory = listPopularSchemasByCategory();
      const categories = opts.category ? { [opts.category]: byCategory[opts.category] } : byCategory;

      if (opts.category && !byCategory[opts.category]) {
        const available = Object.keys(byCategory).join(', ');
        throw new Error(`Unknown category "${opts.category}". Available: ${available}`);
      }

      for (const [category, schemas] of Object.entries(categories)) {
        console.log(`\n=== ${category} ===\n`);
        for (const s of schemas) {
          console.log(`  ${s.name}`);
          console.log(`    Schema:    ${s.schema}`);
          console.log(`    UID:       ${s.uid}`);
          console.log(`    Revocable: ${s.revocable ? 'yes' : 'no'}`);
          console.log(`    ${s.description}\n`);
        }
      }
    } catch (err) {
      handleError(err);
    }
  });
