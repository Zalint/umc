/**
 * Test Data Controller
 * Handles test data generation and cleanup (admin only)
 */

const { query } = require('../config/db');
const { auditModel } = require('../models');

/**
 * Fill test data for all stations
 * POST /api/test-data/fill-all
 */
const fillAllTestData = async (req, res, next) => {
  try {
    // Admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can manage test data'
      });
    }

    // Get admin user ID
    const adminResult = await query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
    if (adminResult.rows.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Admin user not found'
      });
    }
    const adminUserId = adminResult.rows[0].id;

    // Get all stations
    const stationsResult = await query(`
      SELECT s.id, s.name, COALESCE(sm.registered_voters, 1000) as registered_voters
      FROM stations s
      LEFT JOIN station_metadata sm ON s.id = sm.station_id
      ORDER BY s.id
    `);
    const stations = stationsResult.rows;

    if (stations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No stations found'
      });
    }

    // Get all active participants
    const participantsResult = await query(`
      SELECT id, name, short_name 
      FROM participants 
      WHERE is_active = true 
      ORDER BY display_order, name
    `);
    const participants = participantsResult.rows;

    if (participants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No participants found'
      });
    }

    // Find UMC
    const umc = participants.find(p => 
      p.short_name === 'UMC' || 
      p.name.toLowerCase().includes('unite movement for change') ||
      p.name.toLowerCase().includes('united movement for change')
    );

    if (!umc) {
      return res.status(400).json({
        success: false,
        message: 'United Movement for Change (UMC) not found'
      });
    }

    // Find UDP
    const udp = participants.find(p => 
      p.short_name === 'UDP' || 
      p.name.toLowerCase().includes('united democratic party')
    );

    if (!udp) {
      return res.status(400).json({
        success: false,
        message: 'United Democratic Party (UDP) not found'
      });
    }

    const otherParticipants = participants.filter(p => p.id !== umc.id && p.id !== udp.id);

    await query('BEGIN');

    let processedCount = 0;

    for (const station of stations) {
      const registeredVoters = station.registered_voters;
      
      // Voter turnout: 70-85%
      const turnoutRate = 0.70 + Math.random() * 0.15;
      const totalVoters = Math.floor(registeredVoters * turnoutRate);
      
      // Blank ballots: 1-3%
      const blankBallots = Math.floor(totalVoters * (0.01 + Math.random() * 0.02));
      
      // Spoiled ballots: 1-2%
      const spoiledBallots = Math.floor(totalVoters * (0.01 + Math.random() * 0.01));
      
      // Valid votes
      const validVotes = totalVoters - blankBallots - spoiledBallots;
      
      // UMC wins with ~52% nationally (80% in Kanifing, 45-60% elsewhere)
      // For simplicity, we'll use varied percentages
      const isKanifing = station.name.toLowerCase().includes('kanifing');
      const umcPercentage = isKanifing 
        ? 0.75 + Math.random() * 0.10  // 75-85% in Kanifing
        : 0.45 + Math.random() * 0.15; // 45-60% elsewhere
      
      const umcVotes = Math.floor(validVotes * Math.min(umcPercentage, 0.95));
      
      // UDP second
      const udpPercentage = isKanifing
        ? 0.10 + Math.random() * 0.10  // 10-20% in Kanifing
        : 0.35 + Math.random() * 0.10; // 35-45% elsewhere
      
      const udpVotes = Math.floor(validVotes * Math.min(udpPercentage, 0.95));
      
      // Remaining votes for other parties
      let remainingVotes = validVotes - umcVotes - udpVotes;
      
      // Insert UMC votes
      await query(
        `INSERT INTO results (station_id, participant_id, vote_count, submitted_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (station_id, participant_id) 
         DO UPDATE SET vote_count = EXCLUDED.vote_count, updated_at = CURRENT_TIMESTAMP`,
        [station.id, umc.id, umcVotes, adminUserId]
      );
      
      // Insert UDP votes
      await query(
        `INSERT INTO results (station_id, participant_id, vote_count, submitted_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (station_id, participant_id) 
         DO UPDATE SET vote_count = EXCLUDED.vote_count, updated_at = CURRENT_TIMESTAMP`,
        [station.id, udp.id, udpVotes, adminUserId]
      );
      
      // Distribute remaining votes among other participants
      for (const participant of otherParticipants) {
        if (remainingVotes <= 0) break;
        
        const maxVotes = Math.min(remainingVotes, Math.floor(validVotes * 0.08));
        const votes = Math.floor(Math.random() * maxVotes);
        remainingVotes -= votes;
        
        if (votes > 0) {
          await query(
            `INSERT INTO results (station_id, participant_id, vote_count, submitted_by)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (station_id, participant_id) 
             DO UPDATE SET vote_count = EXCLUDED.vote_count, updated_at = CURRENT_TIMESTAMP`,
            [station.id, participant.id, votes, adminUserId]
          );
        }
      }
      
      // Update station metadata
      await query(
        `INSERT INTO station_metadata (station_id, blank_ballots, spoiled_ballots, updated_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (station_id) 
         DO UPDATE SET 
           blank_ballots = EXCLUDED.blank_ballots,
           spoiled_ballots = EXCLUDED.spoiled_ballots,
           updated_by = EXCLUDED.updated_by,
           updated_at = CURRENT_TIMESTAMP`,
        [station.id, blankBallots, spoiledBallots, adminUserId]
      );
      
      processedCount++;
    }

    await query('COMMIT');

    // Log action
    const ipAddress = req.ip || req.connection.remoteAddress;
    await auditModel.logAction(
      req.user.id,
      'TEST_DATA',
      'results',
      null,
      `Filled test data for all ${processedCount} stations`,
      ipAddress
    );

    res.json({
      success: true,
      message: `Test data filled for ${processedCount} stations`,
      data: {
        stations_filled: processedCount,
        participants: participants.length
      }
    });

  } catch (error) {
    await query('ROLLBACK').catch(() => {});
    next(error);
  }
};

/**
 * Fill test data for projection subset only (clears all first)
 * POST /api/test-data/fill-subset
 */
const fillSubsetTestData = async (req, res, next) => {
  try {
    // Admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can manage test data'
      });
    }

    // Get admin user ID
    const adminResult = await query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
    if (adminResult.rows.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Admin user not found'
      });
    }
    const adminUserId = adminResult.rows[0].id;

    await query('BEGIN');

    // STEP 1: Clear all existing test data first
    const deleteResults = await query('DELETE FROM results');
    const resetMetadata = await query(`
      UPDATE station_metadata 
      SET blank_ballots = 0, spoiled_ballots = 0, updated_at = CURRENT_TIMESTAMP
    `);

    // STEP 2: Get projection stations only
    const stationsResult = await query(`
      SELECT s.id, s.name, COALESCE(sm.registered_voters, 1000) as registered_voters
      FROM stations s
      LEFT JOIN station_metadata sm ON s.id = sm.station_id
      WHERE s.is_projection_station = true
      ORDER BY s.id
    `);
    const stations = stationsResult.rows;

    if (stations.length === 0) {
      await query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No projection stations found. Please set up projection stations first.'
      });
    }

    // Get all active participants
    const participantsResult = await query(`
      SELECT id, name, short_name 
      FROM participants 
      WHERE is_active = true 
      ORDER BY display_order, name
    `);
    const participants = participantsResult.rows;

    // Find UMC
    const umc = participants.find(p => 
      p.short_name === 'UMC' || 
      p.name.toLowerCase().includes('unite movement for change') ||
      p.name.toLowerCase().includes('united movement for change')
    );

    if (!umc) {
      await query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'United Movement for Change (UMC) not found'
      });
    }

    // Check/create NPP
    let nppResult = await query(
      `SELECT id FROM participants WHERE name ILIKE '%National People%s Party%' LIMIT 1`
    );
    
    let nppId;
    if (nppResult.rows.length === 0) {
      const categoryResult = await query(
        `SELECT id FROM participant_categories WHERE name = 'Political Party' LIMIT 1`
      );
      
      if (categoryResult.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(400).json({
          success: false,
          message: 'Political Party category not found'
        });
      }
      
      const createNppResult = await query(
        `INSERT INTO participants (category_id, name, short_name, is_active, display_order, created_by)
         VALUES ($1, 'National People''s Party', 'NPP', true, 8, $2)
         RETURNING id`,
        [categoryResult.rows[0].id, adminUserId]
      );
      
      nppId = createNppResult.rows[0].id;
    } else {
      nppId = nppResult.rows[0].id;
    }

    const otherParticipants = participants.filter(p => p.id !== umc.id && p.id !== nppId);

    let processedCount = 0;

    for (const station of stations) {
      const registeredVoters = station.registered_voters;
      
      // Voter turnout: 70-85%
      const turnoutRate = 0.70 + Math.random() * 0.15;
      const totalVoters = Math.floor(registeredVoters * turnoutRate);
      
      // Blank ballots: 1-3%
      const blankBallots = Math.floor(totalVoters * (0.01 + Math.random() * 0.02));
      
      // Spoiled ballots: 1-2%
      const spoiledBallots = Math.floor(totalVoters * (0.01 + Math.random() * 0.01));
      
      // Valid votes
      const validVotes = totalVoters - blankBallots - spoiledBallots;
      
      // UMC wins with 50-55%
      const umcPercentage = 0.50 + Math.random() * 0.05;
      const umcVotes = Math.floor(validVotes * umcPercentage);
      
      // NPP second with 35-40%
      const nppPercentage = 0.35 + Math.random() * 0.05;
      const nppVotes = Math.floor(validVotes * nppPercentage);
      
      // Remaining votes for other parties
      let remainingVotes = validVotes - umcVotes - nppVotes;
      
      // Insert UMC votes
      await query(
        `INSERT INTO results (station_id, participant_id, vote_count, submitted_by)
         VALUES ($1, $2, $3, $4)`,
        [station.id, umc.id, umcVotes, adminUserId]
      );
      
      // Insert NPP votes
      await query(
        `INSERT INTO results (station_id, participant_id, vote_count, submitted_by)
         VALUES ($1, $2, $3, $4)`,
        [station.id, nppId, nppVotes, adminUserId]
      );
      
      // Distribute remaining votes
      for (const participant of otherParticipants) {
        if (remainingVotes <= 0) break;
        
        const maxVotes = Math.min(remainingVotes, Math.floor(validVotes * 0.05));
        const votes = Math.floor(Math.random() * maxVotes);
        remainingVotes -= votes;
        
        if (votes > 0) {
          await query(
            `INSERT INTO results (station_id, participant_id, vote_count, submitted_by)
             VALUES ($1, $2, $3, $4)`,
            [station.id, participant.id, votes, adminUserId]
          );
        }
      }
      
      // Update station metadata
      await query(
        `INSERT INTO station_metadata (station_id, blank_ballots, spoiled_ballots, updated_by)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (station_id) 
         DO UPDATE SET 
           blank_ballots = EXCLUDED.blank_ballots,
           spoiled_ballots = EXCLUDED.spoiled_ballots,
           updated_by = EXCLUDED.updated_by,
           updated_at = CURRENT_TIMESTAMP`,
        [station.id, blankBallots, spoiledBallots, adminUserId]
      );
      
      processedCount++;
    }

    await query('COMMIT');

    // Log action
    const ipAddress = req.ip || req.connection.remoteAddress;
    await auditModel.logAction(
      req.user.id,
      'TEST_DATA',
      'results',
      null,
      `Cleared all test data and filled ${processedCount} projection stations`,
      ipAddress
    );

    res.json({
      success: true,
      message: `All test data cleared and filled for ${processedCount} projection stations`,
      data: {
        stations_filled: processedCount,
        results_cleared: deleteResults.rowCount,
        metadata_reset: resetMetadata.rowCount
      }
    });

  } catch (error) {
    await query('ROLLBACK').catch(() => {});
    next(error);
  }
};

/**
 * Clear all test data
 * POST /api/test-data/clear-all
 */
const clearAllTestData = async (req, res, next) => {
  try {
    // Admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can manage test data'
      });
    }

    await query('BEGIN');

    // Delete all results
    const deleteResults = await query('DELETE FROM results');
    
    // Reset all metadata
    const resetMetadata = await query(`
      UPDATE station_metadata 
      SET blank_ballots = 0, spoiled_ballots = 0, updated_at = CURRENT_TIMESTAMP
    `);

    await query('COMMIT');

    // Log action
    const ipAddress = req.ip || req.connection.remoteAddress;
    await auditModel.logAction(
      req.user.id,
      'TEST_DATA',
      'results',
      null,
      `Cleared all test data (${deleteResults.rowCount} results, ${resetMetadata.rowCount} metadata records)`,
      ipAddress
    );

    res.json({
      success: true,
      message: 'All test data cleared successfully',
      data: {
        results_deleted: deleteResults.rowCount,
        metadata_reset: resetMetadata.rowCount
      }
    });

  } catch (error) {
    await query('ROLLBACK').catch(() => {});
    next(error);
  }
};

/**
 * Fill test member data with Gambia names
 * POST /api/test-data/fill-members
 */
const fillTestMembers = async (req, res, next) => {
  try {
    // Admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can manage test data'
      });
    }

    // Gambia common names
    const firstNames = {
      male: ['Ousman', 'Bakary', 'Ebrima', 'Lamin', 'Momodou', 'Amadou', 'Ismaila', 'Mamadou', 'Sulayman', 'Abdou', 'Sainey', 'Modou', 'Yaya', 'Malick', 'Mamour', 'Pa', 'Karamo', 'Demba', 'Tamba', 'Foday'],
      female: ['Fatou', 'Aminata', 'Mariama', 'Awa', 'Isatou', 'Haddy', 'Kadijatou', 'Kaddy', 'Jainaba', 'Ramou', 'Aja', 'Maimouna', 'Binta', 'Awa', 'Bintou', 'Mama', 'Kumba', 'Sainabou', 'Haddy', 'Jabou']
    };

    const lastNames = ['Jallow', 'Bojang', 'Jobe', 'Sanneh', 'Touray', 'Sarr', 'Manneh', 'Ceesay', 'Jawara', 'Njie', 'Saidy', 'Dibba', 'Faal', 'Correa', 'Gomez', 'Sowe', 'Jagne', 'Gassama', 'Badjie', 'Colley', 'Njie', 'Jallow', 'Sambou', 'Bah', 'Kanteh', 'Jammeh', 'Njie', 'Jeng', 'Secka', 'Sanyang'];

    const occupations = ['Farmer', 'Teacher', 'Nurse', 'Business Owner', 'Driver', 'Trader', 'Fisherman', 'Student', 'Carpenter', 'Mason', 'Tailor', 'Shopkeeper', 'Security Guard', 'Chef', 'Mechanic'];
    
    const addresses = [
      'Banjul Street, Kanifing',
      'Serekunda Market Area',
      'Bakau New Town',
      'Fajara Estate',
      'Brusubi Phase 1',
      'Kotu Beach Road',
      'Latrikunda Sabiji',
      'Tallinding Kunjang',
      'Brikama Town',
      'Basse Santa Su',
      'Farafenni Main Street',
      'Bansang Hospital Road'
    ];

    // Get all stations
    const stationsResult = await query(`
      SELECT s.id, s.name, s.constituency_id, c.region_id
      FROM stations s
      INNER JOIN constituencies c ON s.constituency_id = c.id
      ORDER BY RANDOM()
      LIMIT 100
    `);
    const stations = stationsResult.rows;

    if (stations.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No stations found'
      });
    }

    await query('BEGIN');

    let createdCount = 0;
    const usedPhones = new Set();
    const usedEmails = new Set();

    // Generate random phone number
    const generatePhone = () => {
      let phone;
      do {
        const digits = Math.floor(1000000 + Math.random() * 9000000);
        phone = `+220${digits}`;
      } while (usedPhones.has(phone));
      usedPhones.add(phone);
      return phone;
    };

    // Generate random email for all test members
    const generateEmail = (firstName, lastName) => {
      const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'];
      const domain = domains[Math.floor(Math.random() * domains.length)];
      
      // Create email from firstname.lastname with random number
      const randomNum = Math.floor(Math.random() * 10000);
      const emailPrefix = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomNum}`;
      let email = `${emailPrefix}@${domain}`;
      
      // Ensure uniqueness - if duplicate, add more random numbers
      let attempts = 0;
      while (usedEmails.has(email) && attempts < 10) {
        const additionalRandom = Math.floor(Math.random() * 100000);
        email = `${emailPrefix}${additionalRandom}@${domain}`;
        attempts++;
      }
      
      usedEmails.add(email);
      return email;
    };

    for (const station of stations) {
      // Create 3-5 members per station
      const membersPerStation = 3 + Math.floor(Math.random() * 3);
      
      for (let i = 0; i < membersPerStation; i++) {
        const isMale = Math.random() > 0.5;
        const firstName = firstNames[isMale ? 'male' : 'female'][
          Math.floor(Math.random() * firstNames[isMale ? 'male' : 'female'].length)
        ];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const age = 18 + Math.floor(Math.random() * 50); // 18-68
        const sexe = isMale ? 'Male' : 'Female';
        const occupation = occupations[Math.floor(Math.random() * occupations.length)];
        const phone = generatePhone();
        const email = generateEmail(firstName, lastName);
        const address = addresses[Math.floor(Math.random() * addresses.length)];

        await query(
          `INSERT INTO members (
            first_name, last_name, phone, email, age, sexe, occupation, address,
            station_id, constituency_id, region_id, created_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            firstName,
            lastName,
            phone,
            email,
            age,
            sexe,
            occupation,
            address,
            station.id,
            station.constituency_id,
            station.region_id,
            req.user.id
          ]
        );

        createdCount++;
      }
    }

    await query('COMMIT');

    // Log action
    const ipAddress = req.ip || req.connection.remoteAddress;
    await auditModel.logAction(
      req.user.id,
      'TEST_DATA',
      'members',
      null,
      `Created ${createdCount} test members`,
      ipAddress
    );

    res.json({
      success: true,
      message: `Created ${createdCount} test members`,
      data: {
        members_created: createdCount
      }
    });

  } catch (error) {
    await query('ROLLBACK').catch(() => {});
    next(error);
  }
};

/**
 * Clear all test member data
 * POST /api/test-data/clear-members
 */
const clearTestMembers = async (req, res, next) => {
  try {
    // Admin only
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can manage test data'
      });
    }

    const deleteResult = await query('DELETE FROM members');

    // Log action
    const ipAddress = req.ip || req.connection.remoteAddress;
    await auditModel.logAction(
      req.user.id,
      'TEST_DATA',
      'members',
      null,
      `Cleared all test members (${deleteResult.rowCount} deleted)`,
      ipAddress
    );

    res.json({
      success: true,
      message: 'All test members cleared successfully',
      data: {
        members_deleted: deleteResult.rowCount
      }
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
  fillAllTestData,
  fillSubsetTestData,
  clearAllTestData,
  fillTestMembers,
  clearTestMembers
};

