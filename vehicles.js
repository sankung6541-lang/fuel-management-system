/**
 * Vehicle Registry - ทะเบียนรถหน่วย
 */

const VehicleRegistry = {
    STORAGE_KEY: 'fuel_vehicles',

    // ข้อมูลรถเริ่มต้น
    getDefaultVehicles() {
        return [
            { id: 'V001', plate: 'ทบ 1234', type: 'รถจิ๊ป', brand: 'Toyota', fuelType: 'diesel', department: 'กองบังคับการ', active: true },
            { id: 'V002', plate: 'ทบ 5678', type: 'รถบรรทุก', brand: 'Isuzu', fuelType: 'diesel', department: 'กองร้อยที่ 1', active: true },
            { id: 'V003', plate: 'ทบ 9012', type: 'รถตู้', brand: 'Toyota', fuelType: 'benzin95', department: 'กองร้อยที่ 2', active: true },
            { id: 'V004', plate: 'ทบ 3456', type: 'รถเก๋ง', brand: 'Honda', fuelType: 'benzin91', department: 'ฝ่ายธุรการ', active: true }
        ];
    },

    init() {
        if (!this.getAll() || this.getAll().length === 0) {
            this.save(this.getDefaultVehicles());
        }
    },

    getAll() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    save(vehicles) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(vehicles));
    },

    getById(id) {
        return this.getAll().find(v => v.id === id);
    },

    getByPlate(plate) {
        return this.getAll().find(v => v.plate === plate);
    },

    getActive() {
        return this.getAll().filter(v => v.active);
    },

    getByFuelType(fuelType) {
        return this.getActive().filter(v => v.fuelType === fuelType);
    },

    add(vehicle) {
        const vehicles = this.getAll();
        vehicle.id = 'V' + String(vehicles.length + 1).padStart(3, '0');
        vehicle.active = true;
        vehicles.push(vehicle);
        this.save(vehicles);
        return vehicle;
    },

    update(id, updates) {
        const vehicles = this.getAll();
        const index = vehicles.findIndex(v => v.id === id);
        if (index === -1) return false;
        vehicles[index] = { ...vehicles[index], ...updates };
        this.save(vehicles);
        return true;
    },

    delete(id) {
        const vehicles = this.getAll().filter(v => v.id !== id);
        this.save(vehicles);
        return true;
    },

    // สร้าง dropdown options
    getOptions(fuelType = null) {
        let vehicles = this.getActive();
        if (fuelType) {
            vehicles = vehicles.filter(v => v.fuelType === fuelType);
        }
        return vehicles.map(v => ({
            value: v.plate,
            label: `${v.plate} - ${v.type} (${v.department})`
        }));
    }
};

// Initialize
VehicleRegistry.init();
window.VehicleRegistry = VehicleRegistry;
