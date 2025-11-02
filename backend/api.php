<?php
/**
 * GRBL Web Control Pro - Backend API
 * Handles tools and materials library management
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Data directory
$dataDir = __DIR__ . '/data/';
$toolsFile = $dataDir . 'tools.json';
$materialsFile = $dataDir . 'materials.json';
$passwordFile = $dataDir . 'password.json';

// Ensure data directory exists
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0755, true);
}

// Initialize files if they don't exist
if (!file_exists($toolsFile)) {
    file_put_contents($toolsFile, json_encode([]));
}
if (!file_exists($materialsFile)) {
    file_put_contents($materialsFile, json_encode([]));
}
if (!file_exists($passwordFile)) {
    // Default password: "admin"
    $defaultHash = password_hash('admin', PASSWORD_DEFAULT);
    file_put_contents($passwordFile, json_encode(['hash' => $defaultHash]));
}

// Get request data
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['action'])) {
    respondError('Invalid request');
}

$action = $data['action'];

// Route actions
switch ($action) {
    case 'authenticate':
        authenticate($data);
        break;
        
    case 'getTools':
        getTools();
        break;
        
    case 'getMaterials':
        getMaterials();
        break;
        
    case 'saveTool':
        requireAuth($data);
        saveTool($data);
        break;
        
    case 'saveMaterial':
        requireAuth($data);
        saveMaterial($data);
        break;
        
    case 'deleteTool':
        requireAuth($data);
        deleteTool($data);
        break;
        
    case 'deleteMaterial':
        requireAuth($data);
        deleteMaterial($data);
        break;
        
    default:
        respondError('Unknown action');
}

// Authentication
function authenticate($data) {
    global $passwordFile;
    
    if (!isset($data['password'])) {
        respondError('Password required');
    }
    
    $passwordData = json_decode(file_get_contents($passwordFile), true);
    $hash = $passwordData['hash'];
    
    if (password_verify($data['password'], $hash)) {
        respondSuccess(null, 'Authenticated');
    } else {
        respondError('Invalid password');
    }
}

function requireAuth($data) {
    global $passwordFile;
    
    if (!isset($data['password'])) {
        respondError('Authentication required');
    }
    
    $passwordData = json_decode(file_get_contents($passwordFile), true);
    $hash = $passwordData['hash'];
    
    if (!password_verify($data['password'], $hash)) {
        respondError('Invalid password');
    }
}

// Tools
function getTools() {
    global $toolsFile;
    $tools = json_decode(file_get_contents($toolsFile), true);
    respondSuccess($tools);
}

function saveTool($data) {
    global $toolsFile;
    
    if (!isset($data['data'])) {
        respondError('Tool data required');
    }
    
    $tool = $data['data'];
    
    // Validate required fields
    $required = ['name', 'category'];
    foreach ($required as $field) {
        if (!isset($tool[$field])) {
            respondError("Missing required field: $field");
        }
    }
    
    // Validate category
    $validCategories = ['cnc', 'plotter', 'pencil'];
    if (!in_array($tool['category'], $validCategories)) {
        respondError('Invalid category');
    }
    
    // Load existing tools
    $tools = json_decode(file_get_contents($toolsFile), true);
    
    // Generate ID if new
    if (!isset($tool['id']) || empty($tool['id'])) {
        $tool['id'] = 'tool_' . time() . '_' . rand(1000, 9999);
        $tools[] = $tool;
    } else {
        // Update existing
        $found = false;
        foreach ($tools as $index => $t) {
            if ($t['id'] === $tool['id']) {
                $tools[$index] = $tool;
                $found = true;
                break;
            }
        }
        if (!$found) {
            $tools[] = $tool;
        }
    }
    
    // Save
    file_put_contents($toolsFile, json_encode($tools, JSON_PRETTY_PRINT));
    respondSuccess($tool, 'Tool saved');
}

function deleteTool($data) {
    global $toolsFile;
    
    if (!isset($data['id'])) {
        respondError('Tool ID required');
    }
    
    $tools = json_decode(file_get_contents($toolsFile), true);
    $tools = array_filter($tools, function($t) use ($data) {
        return $t['id'] !== $data['id'];
    });
    
    // Re-index array
    $tools = array_values($tools);
    
    file_put_contents($toolsFile, json_encode($tools, JSON_PRETTY_PRINT));
    respondSuccess(null, 'Tool deleted');
}

// Materials
function getMaterials() {
    global $materialsFile;
    $materials = json_decode(file_get_contents($materialsFile), true);
    respondSuccess($materials);
}

function saveMaterial($data) {
    global $materialsFile;

    if (!isset($data['data'])) {
        respondError('Material data required');
    }

    $material = $data['data'];

    // Validate required fields
    $required = ['name', 'category'];
    foreach ($required as $field) {
        if (!isset($material[$field])) {
            respondError("Missing required field: $field");
        }
    }

    // Validate category
    $validCategories = ['wood', 'plastic', 'metal'];
    if (!in_array($material['category'], $validCategories)) {
        respondError('Invalid category');
    }

    // Load existing materials
    $materials = json_decode(file_get_contents($materialsFile), true);
    
    // Generate ID if new
    if (!isset($material['id']) || empty($material['id'])) {
        $material['id'] = 'material_' . time() . '_' . rand(1000, 9999);
        $materials[] = $material;
    } else {
        // Update existing
        $found = false;
        foreach ($materials as $index => $m) {
            if ($m['id'] === $material['id']) {
                $materials[$index] = $material;
                $found = true;
                break;
            }
        }
        if (!$found) {
            $materials[] = $material;
        }
    }
    
    // Save
    file_put_contents($materialsFile, json_encode($materials, JSON_PRETTY_PRINT));
    respondSuccess($material, 'Material saved');
}

function deleteMaterial($data) {
    global $materialsFile;
    
    if (!isset($data['id'])) {
        respondError('Material ID required');
    }
    
    $materials = json_decode(file_get_contents($materialsFile), true);
    $materials = array_filter($materials, function($m) use ($data) {
        return $m['id'] !== $data['id'];
    });
    
    // Re-index array
    $materials = array_values($materials);
    
    file_put_contents($materialsFile, json_encode($materials, JSON_PRETTY_PRINT));
    respondSuccess(null, 'Material deleted');
}

// Response helpers
function respondSuccess($data = null, $message = 'Success') {
    echo json_encode([
        'success' => true,
        'message' => $message,
        'data' => $data
    ]);
    exit();
}

function respondError($message, $code = 400) {
    http_response_code($code);
    echo json_encode([
        'success' => false,
        'message' => $message
    ]);
    exit();
}
