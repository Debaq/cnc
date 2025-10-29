<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

// Configuration
define('DATA_DIR', __DIR__ . '/data');
define('PASSWORD_FILE', DATA_DIR . '/password.json');
define('TOOLS_FILE', DATA_DIR . '/tools.json');
define('MATERIALS_FILE', DATA_DIR . '/materials.json');

// Ensure data directory exists
if (!file_exists(DATA_DIR)) {
    mkdir(DATA_DIR, 0755, true);
}

// Initialize password if doesn't exist
if (!file_exists(PASSWORD_FILE)) {
    $defaultPassword = password_hash('admin123', PASSWORD_DEFAULT);
    file_put_contents(PASSWORD_FILE, json_encode(['hash' => $defaultPassword]));
}

// Initialize tools if doesn't exist
if (!file_exists(TOOLS_FILE)) {
    $defaultTools = [
        [
            'name' => 'Fresa 3mm',
            'type' => 'endmill',
            'diameter' => 3.175,
            'flutes' => 2,
            'material' => 'carbide',
            'feedRate' => 800,
            'rpm' => 10000
        ],
        [
            'name' => 'Fresa 6mm',
            'type' => 'endmill',
            'diameter' => 6,
            'flutes' => 2,
            'material' => 'carbide',
            'feedRate' => 1200,
            'rpm' => 12000
        ]
    ];
    file_put_contents(TOOLS_FILE, json_encode($defaultTools, JSON_PRETTY_PRINT));
}

// Initialize materials if doesn't exist
if (!file_exists(MATERIALS_FILE)) {
    $defaultMaterials = [
        [
            'name' => 'MDF 9mm',
            'type' => 'mdf',
            'thickness' => 9,
            'depthPerPass' => 1.5,
            'feedRate' => 1000,
            'rpm' => 12000,
            'laserPower' => 60,
            'laserSpeed' => 800
        ],
        [
            'name' => 'Madera blanda 6mm',
            'type' => 'wood',
            'thickness' => 6,
            'depthPerPass' => 2,
            'feedRate' => 1200,
            'rpm' => 10000,
            'laserPower' => 50,
            'laserSpeed' => 1000
        ]
    ];
    file_put_contents(MATERIALS_FILE, json_encode($defaultMaterials, JSON_PRETTY_PRINT));
}

// Helper functions
function verifyPassword($password) {
    $data = json_decode(file_get_contents(PASSWORD_FILE), true);
    return password_verify($password, $data['hash']);
}

function loadTools() {
    if (!file_exists(TOOLS_FILE)) {
        return [];
    }
    return json_decode(file_get_contents(TOOLS_FILE), true) ?: [];
}

function saveTools($tools) {
    return file_put_contents(TOOLS_FILE, json_encode($tools, JSON_PRETTY_PRINT)) !== false;
}

function loadMaterials() {
    if (!file_exists(MATERIALS_FILE)) {
        return [];
    }
    return json_decode(file_get_contents(MATERIALS_FILE), true) ?: [];
}

function saveMaterials($materials) {
    return file_put_contents(MATERIALS_FILE, json_encode($materials, JSON_PRETTY_PRINT)) !== false;
}

// Handle requests
$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    
    switch ($action) {
        case 'get_tools':
            $tools = loadTools();
            echo json_encode(['success' => true, 'tools' => $tools]);
            break;
            
        case 'get_materials':
            $materials = loadMaterials();
            echo json_encode(['success' => true, 'materials' => $materials]);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
    
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    $password = $input['password'] ?? '';
    
    switch ($action) {
        case 'check_password':
            $valid = verifyPassword($password);
            echo json_encode(['success' => $valid]);
            break;
            
        case 'save_tool':
            if (!verifyPassword($password)) {
                echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta']);
                break;
            }
            
            $tool = $input['tool'] ?? null;
            if (!$tool) {
                echo json_encode(['success' => false, 'message' => 'Datos de herramienta inválidos']);
                break;
            }
            
            $tools = loadTools();
            $tools[] = $tool;
            
            if (saveTools($tools)) {
                echo json_encode(['success' => true, 'message' => 'Herramienta guardada']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Error al guardar']);
            }
            break;
            
        case 'save_material':
            if (!verifyPassword($password)) {
                echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta']);
                break;
            }
            
            $material = $input['material'] ?? null;
            if (!$material) {
                echo json_encode(['success' => false, 'message' => 'Datos de material inválidos']);
                break;
            }
            
            $materials = loadMaterials();
            $materials[] = $material;
            
            if (saveMaterials($materials)) {
                echo json_encode(['success' => true, 'message' => 'Material guardado']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Error al guardar']);
            }
            break;
            
        case 'delete_tool':
            if (!verifyPassword($password)) {
                echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta']);
                break;
            }
            
            $index = $input['index'] ?? null;
            if ($index === null) {
                echo json_encode(['success' => false, 'message' => 'Índice inválido']);
                break;
            }
            
            $tools = loadTools();
            if (isset($tools[$index])) {
                array_splice($tools, $index, 1);
                
                if (saveTools($tools)) {
                    echo json_encode(['success' => true, 'message' => 'Herramienta eliminada']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Error al eliminar']);
                }
            } else {
                echo json_encode(['success' => false, 'message' => 'Herramienta no encontrada']);
            }
            break;
            
        case 'delete_material':
            if (!verifyPassword($password)) {
                echo json_encode(['success' => false, 'message' => 'Contraseña incorrecta']);
                break;
            }
            
            $index = $input['index'] ?? null;
            if ($index === null) {
                echo json_encode(['success' => false, 'message' => 'Índice inválido']);
                break;
            }
            
            $materials = loadMaterials();
            if (isset($materials[$index])) {
                array_splice($materials, $index, 1);
                
                if (saveMaterials($materials)) {
                    echo json_encode(['success' => true, 'message' => 'Material eliminado']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Error al eliminar']);
                }
            } else {
                echo json_encode(['success' => false, 'message' => 'Material no encontrado']);
            }
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
    }
    
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid request method']);
}
