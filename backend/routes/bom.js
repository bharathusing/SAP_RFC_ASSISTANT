import express from 'express';
import XLSX from 'xlsx';
import {
  rfcValidateSourceBom,
  rfcReadBom,
  rfcExplodeBomHierarchy,
  rfcCreateBom,
  rfcCopyBom,
  rfcDeleteBom,
  rfcBatchValidateBoms,
  rfcBatchCopyBoms,
  rfcGetBomDisplayData,
  verifyCopiedBomHierarchy,
  pingRfcServer
} from '../services/sapRfcClient.js';
import { validateSourceBom as validateSourceBomGui } from '../services/sapGuiClient.js';
import { requireAuth, requireServerAccess, requireModuleAccess } from '../middleware/auth.js';
import { MODULE_KEYS } from '../config/modules.js';
import { auditLogger } from '../services/auditLog.js';

const router = express.Router();

// Enforce authentication and BOM module enablement on all BOM routes
router.use(requireAuth);
router.use(requireModuleAccess(MODULE_KEYS.BOM));

/**
 * GET /api/bom/ping
 * Checks RFC connectivity to SAP on permitted server.
 */
router.get('/ping', requireServerAccess('read_only'), async (req, res) => {
  try {
    const pingResult = await pingRfcServer(req.selectedServer || {});
    if (!pingResult.success) {
      return res.status(500).json(pingResult);
    }
    return res.status(200).json(pingResult);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/**
 * POST /api/bom/validate-source
 * Validates a source / reference BOM in SAP via fast RFC (CSAP_MAT_BOM_READ)
 * or fallback GUI Scripting.
 */
router.post('/validate-source', requireServerAccess('read_only'), async (req, res) => {
  try {
    const { material, plant, bomUsage, alternativeBom } = req.body || {};

    if (!material || !String(material).trim()) {
      return res.status(200).json({
        success: false,
        errorCode: 'MATERIAL_NOT_FOUND',
        message: 'Material is required for source BOM validation.'
      });
    }

    if (!plant || !String(plant).trim()) {
      return res.status(200).json({
        success: false,
        errorCode: 'MATERIAL_PLANT_INVALID',
        message: 'Plant is required for source BOM validation.'
      });
    }

    const isMock = process.env.USE_MOCK_SAP === 'true';
    const useRfc = process.env.SAP_BOM_MODE === 'RFC' || (!isMock && process.env.SAP_BOM_MODE !== 'GUI');
    let result;
    if (useRfc && !isMock) {
      result = await rfcValidateSourceBom({
        material,
        plant,
        bomUsage,
        alternativeBom,
        server: req.selectedServer
      });
    } else {
      result = await validateSourceBomGui({
        material,
        plant,
        bomUsage,
        alternativeBom
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('[bom.js] validate-source error:', err.message);
    return res.status(200).json({
      success: false,
      errorCode: 'SAP_VALIDATION_ERROR',
      message: `Source BOM validation failed: ${err.message}`
    });
  }
});

/**
 * POST /api/bom/read
 * Serves Single Level Display BOM for BOM Hierarchy Explorer.
 */
router.post('/read', requireServerAccess('read_only'), async (req, res) => {
  try {
    const { material, plant, bomUsage, alternativeBom } = req.body || {};
    const result = await rfcGetBomDisplayData({
      material,
      plant,
      bomUsage,
      alternativeBom,
      multiLevel: false,
      server: req.selectedServer
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `BOM Read failed: ${err.message}`
    });
  }
});

/**
 * POST /api/bom/create
 * Creates a Material BOM via CSAP_MAT_BOM_CREATE (Requires read_write permission).
 */
router.post('/create', requireServerAccess('read_write'), async (req, res) => {
  try {
    const { material, plant, bomUsage, alternativeBom, validFrom, components } = req.body || {};
    const result = await rfcCreateBom({
      material,
      plant,
      bomUsage,
      alternativeBom,
      validFrom,
      components,
      server: req.selectedServer
    });

    if (result.success) {
      auditLogger.logAction({
        user: req.user.email,
        sapUsername: req.user.email,
        system: req.selectedServer?.name || 'SAP-BOM',
        actionType: 'create',
        entityKey: 'bom',
        recordId: `${material}/${plant}`,
        task: `Create BOM ${material} in plant ${plant}`,
        afterValues: { material, plant, bomUsage, alternativeBom, componentCount: components?.length || 0 }
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `BOM Creation failed: ${err.message}`
    });
  }
});

/**
 * POST /api/bom/hierarchy
 * Serves Multi-Level component tree for BOM Hierarchy Explorer.
 */
router.post('/hierarchy', requireServerAccess('read_only'), async (req, res) => {
  try {
    const { material, plant, bomUsage, alternativeBom } = req.body || {};
    const result = await rfcGetBomDisplayData({
      material,
      plant,
      bomUsage,
      alternativeBom,
      multiLevel: true,
      server: req.selectedServer
    });
    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `Failed to explode BOM hierarchy: ${err.message}`
    });
  }
});

/**
 * POST /api/bom/copy
 * Copies a BOM from source to target (Requires read_write permission).
 */
router.post('/copy', requireServerAccess('read_write'), async (req, res) => {
  try {
    const {
      sourceMaterial,
      sourcePlant,
      targetMaterial,
      targetPlant,
      bomUsage,
      alternativeBom,
      sourceAlternative,
      targetAlternative,
      copyHierarchy = true
    } = req.body || {};

    const result = await rfcCopyBom({
      sourceMaterial,
      sourcePlant,
      targetMaterial,
      targetPlant,
      bomUsage,
      alternativeBom,
      sourceAlternative,
      targetAlternative,
      copyHierarchy,
      server: req.selectedServer
    });

    if (result.success) {
      auditLogger.logAction({
        user: req.user.email,
        sapUsername: req.user.email,
        system: req.selectedServer?.name || 'SAP-BOM',
        actionType: 'copy',
        entityKey: 'bom',
        recordId: `${targetMaterial}/${targetPlant}`,
        task: `Copy BOM from ${sourceMaterial}(${sourcePlant}) to ${targetMaterial}(${targetPlant})`,
        afterValues: { sourceMaterial, sourcePlant, targetMaterial, targetPlant, targetAlternative }
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `BOM Copy failed: ${err.message}`
    });
  }
});

/**
 * POST /api/bom/verify-copy
 * Reads created target hierarchy back from SAP and strictly verifies against source hierarchy.
 */
router.post('/verify-copy', requireServerAccess('read_only'), async (req, res) => {
  try {
    const {
      sourceMaterial,
      sourcePlant,
      sourceUsage,
      sourceAlternative,
      targetMaterial,
      targetPlant,
      targetUsage,
      targetAlternative
    } = req.body || {};

    const result = await verifyCopiedBomHierarchy({
      sourceMaterial,
      sourcePlant,
      sourceUsage,
      sourceAlternative,
      targetMaterial,
      targetPlant,
      targetUsage,
      targetAlternative,
      server: req.selectedServer
    });

    auditLogger.logAction({
      user: req.user?.email || 'SYSTEM',
      sapUsername: req.user?.email || 'SYSTEM',
      system: req.selectedServer?.name || 'SAP-BOM',
      actionType: 'verify_copy',
      entityKey: 'bom',
      recordId: `${targetMaterial}/${targetPlant}`,
      task: `Post-copy BOM hierarchy verification for ${targetMaterial} in plant ${targetPlant}`,
      result: result.status || (result.success ? 'SUCCESS' : 'FAILED'),
      afterValues: {
        sourceMaterial,
        sourcePlant,
        targetMaterial,
        targetPlant,
        rootAlternative: result.rootAlternative,
        bomsCreated: result.bomsCreated,
        totalComponents: result.totalComponents,
        verifiedCount: result.verification?.verifiedCount,
        totalCount: result.verification?.totalCount,
        status: result.status,
        differences: result.verification?.differences || []
      }
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('[bom.js] verify-copy error:', err.message);
    return res.status(500).json({
      success: false,
      status: 'FAILED',
      message: `Failed to verify copied BOM: ${err.message}`
    });
  }
});

/**
 * POST /api/bom/delete
 * Deletes a BOM via CSAP_MAT_BOM_DELETE (Requires read_write permission).
 */
router.post('/delete', requireServerAccess('read_write'), async (req, res) => {
  try {
    const { material, plant, bomUsage, alternativeBom } = req.body || {};
    const result = await rfcDeleteBom({
      material,
      plant,
      bomUsage,
      alternativeBom,
      server: req.selectedServer
    });

    if (result.success) {
      auditLogger.logAction({
        user: req.user.email,
        sapUsername: req.user.email,
        system: req.selectedServer?.name || 'SAP-BOM',
        actionType: 'delete',
        entityKey: 'bom',
        recordId: `${material}/${plant}`,
        task: `Delete BOM ${material} in plant ${plant}`,
        afterValues: { material, plant, bomUsage, alternativeBom }
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `BOM Delete failed: ${err.message}`
    });
  }
});

/**
 * POST /api/bom/batch-validate
 * Validates an array of BOM copy requests against SAP on permitted server.
 */
router.post('/batch-validate', requireServerAccess('read_only'), async (req, res) => {
  try {
    const { items = [] } = req.body || {};
    const result = await rfcBatchValidateBoms(items);
    return res.status(200).json(result);
  } catch (err) {
    console.error('[bom.js] batch-validate error:', err.message);
    return res.status(500).json({
      success: false,
      message: `Batch validation failed: ${err.message}`
    });
  }
});

/**
 * POST /api/bom/batch-copy
 * Executes batch BOM copy sequentially (Requires read_write permission).
 */
router.post('/batch-copy', requireServerAccess('read_write'), async (req, res) => {
  try {
    const { items = [], skipErrors = true, copyHierarchy = true } = req.body || {};
    const result = await rfcBatchCopyBoms(items, { skipErrors, copyHierarchy, server: req.selectedServer });

    auditLogger.logAction({
      user: req.user.email,
      sapUsername: req.user.email,
      system: req.selectedServer?.name || 'SAP-BOM',
      actionType: 'batch_copy',
      entityKey: 'bom',
      recordId: `Batch-${items.length}`,
      task: `Batch copied ${items.length} BOMs`,
      afterValues: { total: items.length, successful: result.successfulCount || 0 }
    });

    return res.status(200).json(result);
  } catch (err) {
    console.error('[bom.js] batch-copy error:', err.message);
    return res.status(500).json({
      success: false,
      message: `Batch copy failed: ${err.message}`
    });
  }
});

/**
 * GET /api/bom/template
 * Generates and downloads the official Excel template for Bulk BOM Copy.
 */
router.get('/template', requireServerAccess('read_only'), (req, res) => {
  try {
    const wb = XLSX.utils.book_new();
    const sampleData = [
      {
        'Source Material': 'A1BH0214C',
        'Source Plant': '1012',
        'Source BOM Usage': '1',
        'Source Alternative': '1',
        'Target Material': 'A1BH0214C',
        'Target Plant': '1001',
        'Target BOM Usage': '1',
        'Target Alternative': '12'
      },
      {
        'Source Material': 'A1BH0214C',
        'Source Plant': '1012',
        'Source BOM Usage': '1',
        'Source Alternative': '2',
        'Target Material': 'A1BH0214C',
        'Target Plant': '1001',
        'Target BOM Usage': '1',
        'Target Alternative': '13'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 }
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'BOM_Copy_Template');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="BOM_Copy_Template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: `Failed to generate Excel template: ${err.message}`
    });
  }
});

export default router;
