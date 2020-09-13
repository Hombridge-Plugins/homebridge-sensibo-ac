const AirConditioner = require('./../homekit/AirConditioner')
const RoomSensor = require('./../homekit/RoomSensor')
const HumiditySensor = require('./../homekit/HumiditySensor')
const SyncButton = require('./../homekit/SyncButton')
const ClimateReactSwitch = require('./../homekit/ClimateReactSwitch')
const OccupancySensor = require('./../homekit/OccupancySensor')

module.exports = (platform) => {
	return () => {
		platform.devices.forEach(device => {

			if (!device.remoteCapabilities)
				return
			
			// Add AirConditioner
			const airConditionerIsNew = !platform.activeAccessories.find(accessory => accessory.type === 'AirConditioner' && accessory.id === device.id)
			if (airConditionerIsNew) {
				const airConditioner = new AirConditioner(device, platform)
				platform.activeAccessories.push(airConditioner)

				// Add external Humidity Sensor if enabled
				if (platform.externalHumiditySensor) {
					const humiditySensor = new HumiditySensor(airConditioner, platform)
					platform.activeAccessories.push(humiditySensor)
				}

				// Add Sync Button if enabled
				if (platform.enableSyncButton) {
					const syncButton = new SyncButton(airConditioner, platform)
					platform.activeAccessories.push(syncButton)
				}

				// Add Climate React Switch if enabled
				if (platform.enableClimateReactSwitch) {
					const climateReactSwitch = new ClimateReactSwitch(airConditioner, platform)
					platform.activeAccessories.push(climateReactSwitch)
				}
			}

			// Add Sensibo Room Sensors if exists
			if (device.motionSensors && Array.isArray(device.motionSensors)) {
				device.motionSensors.forEach(sensor => {
					const roomSensorIsNew = !platform.activeAccessories.find(accessory => accessory.type === 'RoomSensor' && accessory.id === sensor.id)
					if (roomSensorIsNew) {
						const roomSensor = new RoomSensor(sensor, device, platform)
						platform.activeAccessories.push(roomSensor)
					}
				})
			}

			// Add Occupancy Sensor if enabled
			if (platform.enableOccupancySensor && !platform.locations.includes(device.location.id)) {
				platform.locations.push(device.location.id)
				const occupancySensor = new OccupancySensor(device, platform)
				platform.activeAccessories.push(occupancySensor)
			}

		})


		// find devices to remove
		const accessoriesToRemove = []
		platform.cachedAccessories.forEach(accessory => {
			let deviceExists, sensorExists, locationExists
			switch(accessory.context.type) {
				case 'AirConditioner':
					deviceExists = platform.devices.find(device => device.id === accessory.context.deviceId && device.remoteCapabilities)
					if (!deviceExists)
						accessoriesToRemove.push(accessory)
					break

				case 'RoomSensor':
					deviceExists = platform.devices.find(device => device.id === accessory.context.deviceId)
					if (!deviceExists || !Array.isArray(deviceExists.motionSensors))
						accessoriesToRemove.push(accessory)
					else {
						sensorExists = deviceExists.motionSensors.find(sensor => sensor.id === accessory.context.sensorId)
						if (!sensorExists)
							accessoriesToRemove.push(accessory)
					}
					break

				case 'HumiditySensor':
					deviceExists = platform.devices.find(device => device.id === accessory.context.deviceId && device.remoteCapabilities)
					if (!deviceExists || !platform.externalHumiditySensor)
						accessoriesToRemove.push(accessory)
					break

				case 'SyncButton':
					deviceExists = platform.devices.find(device => device.id === accessory.context.deviceId && device.remoteCapabilities)
					if (!deviceExists || !platform.enableSyncButton)
						accessoriesToRemove.push(accessory)
					break

				case 'ClimateReact':
					deviceExists = platform.devices.find(device => device.id === accessory.context.deviceId && device.remoteCapabilities)
					if (!deviceExists || !platform.enableClimateReactSwitch)
						accessoriesToRemove.push(accessory)
					break

				case 'OccupancySensor':
					locationExists = platform.devices.find(device => device.location.id === accessory.context.locationId)
					if (!locationExists || !platform.enableOccupancySensor) {
						accessoriesToRemove.push(accessory)
						platform.locations = platform.locations.filter(location => location !== accessory.context.locationId)
					}
					break
			}
		})

		if (accessoriesToRemove.length) {
			platform.log.easyDebug('Unregistering Unnecessary Cached Devices:')
			platform.log.easyDebug(accessoriesToRemove)

			// unregistering accessories
			platform.api.unregisterPlatformAccessories(platform.PLUGIN_NAME, platform.PLATFORM_NAME, accessoriesToRemove)

			// remove from cachedAccessories
			platform.cachedAccessories = platform.cachedAccessories.filter( cachedAccessory => !accessoriesToRemove.find(accessory => accessory.UUID === cachedAccessory.UUID) )

			// remove from activeAccessories
			platform.activeAccessories = platform.activeAccessories.filter( activeAccessory => !accessoriesToRemove.find(accessory => accessory.UUID === activeAccessory.UUID) )
		}
	}
}