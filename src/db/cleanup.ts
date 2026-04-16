import { getDatabaseSync, saveDatabase } from './index.js';

export function cleanupHistoricalData(): {
  activity_logs: number;
  cost_records: number;
} {
  const database = getDatabaseSync();

  database.run('DELETE FROM activity_logs');
  const activity_logs = database.getRowsModified();

  database.run('DELETE FROM cost_records');
  const cost_records = database.getRowsModified();

  saveDatabase();

  return {
    activity_logs,
    cost_records,
  };
}
