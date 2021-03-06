sap.ui.require(
[
	"sap/ui/demo/mdskeleton/model/Device",
	"sap/ui/thirdparty/sinon",
	"sap/ui/thirdparty/sinon-qunit"
],
function (DeviceModel) {
	"use strict";

	module("initialization", {
		teardown: function () {
			this.oDeviceModel.destroy();
		}
	});

	function isPhoneTestCase(bIsPhone) {
		// Arrange
		this.stub(sap.ui.Device, "system", { phone : bIsPhone });

		// System under test
		this.oDeviceModel = new DeviceModel();

		// Assert
		strictEqual(this.oDeviceModel.getData().isPhone, bIsPhone, "IsPhone property is correct");
		strictEqual(this.oDeviceModel.getData().isNoPhone, !bIsPhone, "IsNoPhone property is correct");
	}

	test("Should initialize a device model for desktop", function () {
		isPhoneTestCase.call(this, false);
	});

	test("Should initialize a device model for phone", function () {
		isPhoneTestCase.call(this, true);
	});

	function isTouchTestCase(bIsTouch) {
		// Arrange
		this.stub(sap.ui.Device, "support", { touch : bIsTouch });

		// System under test
		this.oDeviceModel = new DeviceModel();

		// Assert
		strictEqual(this.oDeviceModel.getData().isTouch, bIsTouch, "IsTouch property is correct");
		strictEqual(this.oDeviceModel.getData().isNoTouch, !bIsTouch, "IsNoTouch property is correct");
	}

	test("Should initialize a device model for non touch devices", function () {
		isTouchTestCase.call(this, false);
	});

	test("Should initialize a device model for touch devices", function () {
		isTouchTestCase.call(this, true);
	});

	test("The binding mode of the device model should be one way", function () {

		// System under test
		this.oDeviceModel = new DeviceModel();

		// Assert
		strictEqual(this.oDeviceModel.getDefaultBindingMode(), "OneWay", "Binding mode is correct");
	})
});