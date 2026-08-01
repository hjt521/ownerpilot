/**
 * Human-invoked local live-provider evaluation command.
 *
 * This command reads one explicit Gateway API key file, verifies the requested
 * source commit and clean working tree, evaluates only explicit synthetic cases,
 * prints one bounded JSON report to stdout, and performs no persistence,
 * Preview activation, Production action, fallback, or automatic selection.
 */

import {
  execFileSync,
} from 'node:child_process';
import {
  readFileSync,
  realpathSync,
  statSync,
} from 'node:fs';
import {
  createGateway,
} from 'ai';
import {
  executeLiveProviderEvaluation,
} from '../../lib/agents/evaluation/liveProviderEvaluationCommand';
import {
  parseLiveProviderEvaluationArguments,
} from '../../lib/agents/evaluation/liveProviderEvaluationConfig';

function git(
  repositoryDirectory: string,
  ...args: readonly string[]
): string {
  return execFileSync(
    'git',
    [...args],
    {
      cwd: repositoryDirectory,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  ).trim();
}

async function main(): Promise<void> {
  const config =
    parseLiveProviderEvaluationArguments(
      process.argv.slice(2),
    );

  const invocationDirectory = process.cwd();

  const report =
    await executeLiveProviderEvaluation(
      config,
      {
        inspectRepository: () => {
          const repositoryRoot =
            git(
              invocationDirectory,
              'rev-parse',
              '--show-toplevel',
            );

          return {
            repositoryRootRealPath:
              realpathSync(repositoryRoot),
            headCommit:
              git(
                repositoryRoot,
                'rev-parse',
                'HEAD',
              ),
            workingTreeStatus:
              git(
                repositoryRoot,
                'status',
                '--porcelain=v1',
                '--untracked-files=normal',
              ),
          };
        },
        inspectCredentialFile: path => {
          const realPath = realpathSync(path);
          const stats = statSync(realPath);

          return {
            realPath,
            isRegularFile: stats.isFile(),
            sizeBytes: stats.size,
            mode: stats.mode,
          };
        },
        readCredentialFile:
          realPath =>
            readFileSync(realPath, 'utf8'),
        createGatewayModelFactory:
          apiKey => {
            const gateway =
              createGateway({ apiKey });

            return modelId =>
              gateway(modelId);
          },
      },
    );

  process.stdout.write(
    `${JSON.stringify(report, null, 2)}\n`,
  );
}

void main().catch(error => {
  const detail =
    error instanceof Error
      ? error.message
      : 'Unknown live-provider evaluation failure.';

  console.error(
    `Live-provider evaluation failed: ${detail}`,
  );
  process.exitCode = 1;
});
