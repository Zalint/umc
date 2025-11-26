/**
 * Result Controller
 * Handles election result submission and retrieval
 */

const { resultModel, memberModel, auditModel } = require('../models');
const { ROLES } = require('../config/auth');

/**
 * Submit results for a station
 * POST /api/results
 */
const submitResults = async (req, res, next) => {
  try {
    const { station_id, results } = req.body;
    
    if (!station_id || !results || !Array.isArray(results)) {
      return res.status(400).json({
        success: false,
        message: 'station_id and results array are required'
      });
    }
    
    // Check if user has access to this station (for members)
    if (req.user.role === ROLES.MEMBER) {
      const hasAccess = await memberModel.hasStationAccess(req.user.id, station_id);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to submit results for this station'
        });
      }
    }
    
    // Prepare results for bulk submission
    const resultsToSubmit = results.map(r => ({
      station_id,
      participant_id: r.participant_id,
      vote_count: r.vote_count || 0
    }));
    
    const submittedResults = await resultModel.submitBulkResults(resultsToSubmit, req.user.id);
    
    // Log the action to audit
    const ipAddress = req.ip || req.connection.remoteAddress;
    await auditModel.logAction(
      req.user.id,
      'INSERT',
      'results',
      station_id,
      `Submitted results for station ${station_id} with ${results.length} participants`,
      ipAddress
    );
    
    res.json({
      success: true,
      message: 'Results submitted successfully',
      data: {
        results: submittedResults
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get station results
 * GET /api/results/station/:stationId
 */
const getStationResults = async (req, res, next) => {
  try {
    const { stationId } = req.params;
    
    const summary = await resultModel.getStationResultsSummary(stationId);
    
    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Station not found'
      });
    }
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get constituency results
 * GET /api/results/constituency/:constituencyId
 */
const getConstituencyResults = async (req, res, next) => {
  try {
    const { constituencyId } = req.params;
    
    const summary = await resultModel.getConstituencyResultsSummary(constituencyId);
    
    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Constituency not found'
      });
    }
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get region results
 * GET /api/results/region/:regionId
 */
const getRegionResults = async (req, res, next) => {
  try {
    const { regionId } = req.params;
    
    const summary = await resultModel.getRegionResultsSummary(regionId);
    
    if (!summary) {
      return res.status(404).json({
        success: false,
        message: 'Region not found'
      });
    }
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get country results
 * GET /api/results/country
 */
const getCountryResults = async (req, res, next) => {
  try {
    const summary = await resultModel.getCountryResultsSummary();
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get accessible stations for member
 * GET /api/results/my-stations
 */
const getMyStations = async (req, res, next) => {
  try {
    if (req.user.role !== ROLES.MEMBER) {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only for members'
      });
    }
    
    const stations = await memberModel.getAccessibleStations(req.user.id);
    
    res.json({
      success: true,
      data: {
        stations
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update station metadata (registered voters, blank ballots, spoiled ballots)
 * PUT /api/results/station/:stationId/metadata
 */
const updateStationMetadata = async (req, res, next) => {
  try {
    const { stationId } = req.params;
    const { registered_voters, blank_ballots, spoiled_ballots, has_issue, issue_comment } = req.body;
    
    // Admin, Manager, or Member with access can update
    if (req.user.role === ROLES.READER) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update station metadata'
      });
    }
    
    // For members, check if they have access to this station
    if (req.user.role === ROLES.MEMBER) {
      const hasAccess = await memberModel.hasStationAccess(req.user.id, stationId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to update this station'
        });
      }
    }
    
    // Validate inputs
    if (registered_voters !== undefined && (registered_voters < 0 || isNaN(registered_voters))) {
      return res.status(400).json({
        success: false,
        message: 'Valid registered voters count is required'
      });
    }
    
    if (blank_ballots !== undefined && (blank_ballots < 0 || isNaN(blank_ballots))) {
      return res.status(400).json({
        success: false,
        message: 'Valid blank ballots count is required'
      });
    }
    
    if (spoiled_ballots !== undefined && (spoiled_ballots < 0 || isNaN(spoiled_ballots))) {
      return res.status(400).json({
        success: false,
        message: 'Valid spoiled ballots count is required'
      });
    }
    
    // Validate comment if issue is reported
    if (has_issue === true && (!issue_comment || issue_comment.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Comment is required when an issue is reported'
      });
    }
    
    const data = {
      registered_voters: registered_voters !== undefined ? registered_voters : null,
      blank_ballots: blank_ballots !== undefined ? blank_ballots : null,
      spoiled_ballots: spoiled_ballots !== undefined ? spoiled_ballots : null,
      has_issue: has_issue !== undefined ? has_issue : null,
      issue_comment: issue_comment !== undefined ? (issue_comment || null) : null
    };
    
    await resultModel.updateStationMetadata(stationId, data, req.user.id);
    
    // Log the action to audit
    const ipAddress = req.ip || req.connection.remoteAddress;
    const detailsParts = [];
    if (registered_voters !== undefined) detailsParts.push(`registered_voters=${registered_voters}`);
    if (blank_ballots !== undefined) detailsParts.push(`blank_ballots=${blank_ballots}`);
    if (spoiled_ballots !== undefined) detailsParts.push(`spoiled_ballots=${spoiled_ballots}`);
    if (has_issue !== undefined) detailsParts.push(`has_issue=${has_issue}`);
    if (issue_comment !== undefined) detailsParts.push(`comment=${issue_comment ? 'added' : 'removed'}`);
    const details = `Updated metadata: ${detailsParts.join(', ')}`;
    
    await auditModel.logAction(
      req.user.id,
      'UPDATE',
      'station_metadata',
      stationId,
      details,
      ipAddress
    );
    
    res.json({
      success: true,
      message: 'Station metadata updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export election results to CSV/Excel
 * GET /api/results/export
 */
const exportResults = async (req, res, next) => {
  try {
    const { level, region_id, constituency_id } = req.query;
    
    // Get all stations with results
    let query = `
      SELECT 
        r.name as region_name,
        c.name as constituency_name,
        s.name as station_name,
        sm.registered_voters,
        sm.blank_ballots,
        sm.spoiled_ballots,
        p.name as participant_name,
        p.short_name as participant_short_name,
        pc.name as category_name,
        COALESCE(res.vote_count, 0) as vote_count,
        res.submitted_at
      FROM stations s
      INNER JOIN constituencies c ON s.constituency_id = c.id
      INNER JOIN regions r ON c.region_id = r.id
      LEFT JOIN station_metadata sm ON s.id = sm.station_id
      CROSS JOIN participants p
      INNER JOIN participant_categories pc ON p.category_id = pc.id
      LEFT JOIN results res ON s.id = res.station_id AND p.id = res.participant_id
      WHERE p.is_active = true
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Add filters
    if (region_id) {
      paramCount++;
      query += ` AND r.id = $${paramCount}`;
      params.push(region_id);
    }
    
    if (constituency_id) {
      paramCount++;
      query += ` AND c.id = $${paramCount}`;
      params.push(constituency_id);
    }
    
    query += ` ORDER BY r.name, c.name, s.name, p.display_order, p.name`;
    
    const { query: dbQuery } = require('../config/db');
    const result = await dbQuery(query, params);
    
    // Create CSV with UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    const csvHeader = 'Region,Constituency,Station,Registered Voters,Blank Ballots,Spoiled Ballots,Participant,Short Name,Category,Vote Count,Submitted At\n';
    
    const csvRows = result.rows.map(row => {
      const submittedAt = row.submitted_at ? new Date(row.submitted_at).toLocaleString() : 'Not submitted';
      return `"${row.region_name}","${row.constituency_name}","${row.station_name}",${row.registered_voters || 0},${row.blank_ballots || 0},${row.spoiled_ballots || 0},"${row.participant_name}","${row.participant_short_name}","${row.category_name}",${row.vote_count},"${submittedAt}"`;
    }).join('\n');
    
    const csv = BOM + csvHeader + csvRows;
    
    // Set headers for Excel download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `election_results_${timestamp}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
    
    // Log the export action
    const ipAddress = req.ip || req.connection.remoteAddress;
    await auditModel.logAction(
      req.user.id,
      'EXPORT',
      'results',
      null,
      `Exported election results (${result.rows.length} records)`,
      ipAddress
    );
    
  } catch (error) {
    next(error);
  }
};

/**
 * Export summary results to CSV/Excel
 * GET /api/results/export-summary
 */
const exportSummary = async (req, res, next) => {
  try {
    // Get aggregated results by station
    const { query: dbQuery } = require('../config/db');
    const result = await dbQuery(`
      SELECT 
        r.name as region_name,
        c.name as constituency_name,
        s.name as station_name,
        sm.registered_voters,
        sm.blank_ballots,
        sm.spoiled_ballots,
        COALESCE(SUM(res.vote_count), 0) as total_votes,
        CASE 
          WHEN sm.registered_voters > 0 
          THEN ROUND((COALESCE(SUM(res.vote_count), 0)::numeric / sm.registered_voters::numeric) * 100, 2)
          ELSE 0 
        END as turnout_percent
      FROM stations s
      INNER JOIN constituencies c ON s.constituency_id = c.id
      INNER JOIN regions r ON c.region_id = r.id
      LEFT JOIN station_metadata sm ON s.id = sm.station_id
      LEFT JOIN results res ON s.id = res.station_id
      GROUP BY r.name, c.name, s.name, sm.registered_voters, sm.blank_ballots, sm.spoiled_ballots
      ORDER BY r.name, c.name, s.name
    `);
    
    // Get participant vote counts
    const participantResults = await dbQuery(`
      SELECT 
        s.name as station_name,
        p.short_name as participant,
        COALESCE(res.vote_count, 0) as votes
      FROM stations s
      CROSS JOIN participants p
      LEFT JOIN results res ON s.id = res.station_id AND p.id = res.participant_id
      WHERE p.is_active = true
      ORDER BY s.name, p.display_order, p.name
    `);
    
    // Group participant results by station
    const stationParticipants = {};
    participantResults.rows.forEach(row => {
      if (!stationParticipants[row.station_name]) {
        stationParticipants[row.station_name] = {};
      }
      stationParticipants[row.station_name][row.participant] = row.votes;
    });
    
    // Get unique participants for header
    const participants = [...new Set(participantResults.rows.map(r => r.participant))];
    
    // Create CSV with UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    const participantCols = participants.map(p => `"${p}"`).join(',');
    const csvHeader = `Region,Constituency,Station,Registered Voters,Total Votes,Blank Ballots,Spoiled Ballots,Turnout %,${participantCols}\n`;
    
    const csvRows = result.rows.map(row => {
      const participantVotes = participants.map(p => stationParticipants[row.station_name]?.[p] || 0).join(',');
      return `"${row.region_name}","${row.constituency_name}","${row.station_name}",${row.registered_voters || 0},${row.total_votes},${row.blank_ballots || 0},${row.spoiled_ballots || 0},${row.turnout_percent}%,${participantVotes}`;
    }).join('\n');
    
    const csv = BOM + csvHeader + csvRows;
    
    // Set headers for Excel download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `election_summary_${timestamp}.csv`;
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
    
    // Log the export action
    const ipAddress = req.ip || req.connection.remoteAddress;
    await auditModel.logAction(
      req.user.id,
      'EXPORT',
      'results_summary',
      null,
      `Exported election summary (${result.rows.length} stations)`,
      ipAddress
    );
    
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitResults,
  getStationResults,
  getConstituencyResults,
  getRegionResults,
  getCountryResults,
  getMyStations,
  updateStationMetadata,
  exportResults,
  exportSummary
};

