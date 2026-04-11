import { Router } from 'express';
import {
  getCostRecordsByAgent,
  getCostRecordsByDateRange,
  getTotalCostByAgent,
  getAllAgents
} from '../../db/index.js';
import type { CostRecord } from '../../db/schema.js';

const router = Router();

interface CostRecordWithAgent extends CostRecord {
  agent_name?: string;
}

// GET /api/cost-records - Get cost records with optional date range filter
router.get('/', (req, res) => {
  try {
    const { dateRange, agentId } = req.query;

    let records: CostRecord[] = [];
    const agents = getAllAgents();
    const agentMap = new Map(agents.map(a => [a.id, a.name]));

    if (agentId) {
      const id = parseInt(agentId as string, 10);
      if (!isNaN(id)) {
        records = getCostRecordsByAgent(id);
      }
    } else if (dateRange) {
      const { startDate, endDate } = getDateRange(dateRange as string);
      records = getCostRecordsByDateRange(startDate, endDate);
    }

    // Enrich records with agent names
    const enrichedRecords: CostRecordWithAgent[] = records.map(record => ({
      ...record,
      agent_name: record.agent_id ? agentMap.get(record.agent_id) || 'Unknown' : 'Unknown'
    }));

    res.json(enrichedRecords);
  } catch (error) {
    console.error('Error getting cost records:', error);
    res.status(500).json({ error: 'Failed to get cost records' });
  }
});

// GET /api/cost-records/summary - Get aggregated cost summary
router.get('/summary', (req, res) => {
  try {
    const { dateRange } = req.query;
    const agents = getAllAgents();

    let records: CostRecord[] = [];
    if (dateRange) {
      const { startDate, endDate } = getDateRange(dateRange as string);
      records = getCostRecordsByDateRange(startDate, endDate);
    }

    // Calculate totals per agent
    const agentSummary = agents.map(agent => {
      const agentRecords = records.filter(r => r.agent_id === agent.id);
      const totals = getTotalCostByAgent(agent.id);

      return {
        agent_id: agent.id,
        agent_name: agent.name,
        model: agent.model,
        total_input_tokens: totals.totalInput,
        total_output_tokens: totals.totalOutput,
        total_tokens: totals.totalInput + totals.totalOutput,
        total_cost: totals.totalCost,
        api_calls: agentRecords.length
      };
    });

    // Overall totals
    const overall = agentSummary.reduce(
      (acc, curr) => ({
        total_input_tokens: acc.total_input_tokens + curr.total_input_tokens,
        total_output_tokens: acc.total_output_tokens + curr.total_output_tokens,
        total_tokens: acc.total_tokens + curr.total_tokens,
        total_cost: acc.total_cost + curr.total_cost,
        total_api_calls: acc.total_api_calls + curr.api_calls
      }),
      { total_input_tokens: 0, total_output_tokens: 0, total_tokens: 0, total_cost: 0, total_api_calls: 0 }
    );

    res.json({
      summary: overall,
      by_agent: agentSummary,
      date_range: dateRange ? getDateRange(dateRange as string) : getDateRange('today')
    });
  } catch (error) {
    console.error('Error getting cost summary:', error);
    res.status(500).json({ error: 'Failed to get cost summary' });
  }
});

function getDateRange(range: string): { startDate: string; endDate: string } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = now;

  switch (range) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;
    case 'week':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
}

export default router;