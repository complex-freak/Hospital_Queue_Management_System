import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");

const HeartRiskAssessment = () => {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    restingHeartRate: "",
    peakHeartRate: "",
    postActivityHeartRate: "",
    hrv: "",
    smokingHabit: "",
    dietHabit: "",
    age: "",
    gender: "",
    exerciseFrequency: "",
  });

  const [errors, setErrors] = useState({});
  const [dropdownVisible, setDropdownVisible] = useState({});

  const selectOptions = {
    smokingHabit: [
      { label: "Non-smoker", value: "no" },
      { label: "Current smoker", value: "yes" },
      { label: "Former smoker", value: "former" },
    ],
    dietHabit: [
      { label: "Healthy diet", value: "healthy" },
      { label: "Balanced diet", value: "balanced" },
      { label: "Unhealthy diet", value: "unhealthy" },
    ],
    gender: [
      { label: "Male", value: "male" },
      { label: "Female", value: "female" },
      { label: "Other", value: "other" },
    ],
    exerciseFrequency: [
      { label: "Daily", value: "daily" },
      { label: "Weekly", value: "weekly" },
      { label: "Monthly", value: "monthly" },
      { label: "Rarely", value: "rarely" },
      { label: "Never", value: "never" },
    ],
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const toggleDropdown = (field) => {
    setDropdownVisible({
      ...dropdownVisible,
      [field]: !dropdownVisible[field],
    });
  };

  const selectOption = (field, value) => {
    handleInputChange(field, value);
    setDropdownVisible({ ...dropdownVisible, [field]: false });
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate numeric inputs
    const numericFields = {
      restingHeartRate: { min: 30, max: 200 },
      peakHeartRate: { min: 60, max: 220 },
      postActivityHeartRate: { min: 40, max: 200 },
      hrv: { min: 1, max: 300 },
      age: { min: 1, max: 120 },
    };

    Object.entries(numericFields).forEach(([field, config]) => {
      const value = parseInt(formData[field], 10);
      if (
        !formData[field] ||
        isNaN(value) ||
        value < config.min ||
        value > config.max
      ) {
        newErrors[field] = `Enter a valid number (${config.min}-${config.max})`;
      }
    });

    // Validate select inputs
    const selectFields = [
      "smokingHabit",
      "dietHabit",
      "gender",
      "exerciseFrequency",
    ];
    selectFields.forEach((field) => {
      if (!formData[field]) {
        newErrors[field] = "Please select an option";
      }
    });

    // Logical validation
    const restingHR = parseInt(formData.restingHeartRate, 10);
    const peakHR = parseInt(formData.peakHeartRate, 10);
    const postHR = parseInt(formData.postActivityHeartRate, 10);

    if (!isNaN(restingHR) && !isNaN(peakHR) && peakHR <= restingHR) {
      newErrors.peakHeartRate = "Must be higher than resting heart rate";
    }

    if (!isNaN(postHR) && !isNaN(restingHR) && postHR < restingHR) {
      newErrors.postActivityHeartRate =
        "Must be higher than resting heart rate";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateRiskScore = () => {
    let score = 0;
    const restingHR = parseInt(formData.restingHeartRate, 10);
    const peakHR = parseInt(formData.peakHeartRate, 10);
    const postHR = parseInt(formData.postActivityHeartRate, 10);
    const hrv = parseInt(formData.hrv, 10);
    const age = parseInt(formData.age, 10);
    const recovery = peakHR - postHR;

    // Heart rate factors
    if (restingHR > 100) score += 3;
    else if (restingHR > 80) score += 1;

    if (recovery < 12) score += 3;
    else if (recovery < 20) score += 1;

    if (hrv < 20) score += 2;
    else if (hrv < 30) score += 1;

    // Age factor
    if (age > 65) score += 2;
    else if (age > 45) score += 1;

    // Lifestyle factors
    if (formData.smokingHabit === "yes") score += 4;
    else if (formData.smokingHabit === "former") score += 1;

    if (formData.dietHabit === "unhealthy") score += 2;

    const exercise = formData.exerciseFrequency;
    if (exercise === "never") score += 3;
    else if (exercise === "rarely") score += 2;
    else if (exercise === "monthly") score += 1;

    return score;
  };

  const getRiskLevel = (score) => {
    if (score >= 10) return { level: "High", color: "#FF5630", emoji: "🔴" };
    if (score >= 5) return { level: "Moderate", color: "#FF8B00", emoji: "🟡" };
    return { level: "Low", color: "#36B37E", emoji: "🟢" };
  };

  const assessRisk = async () => {
    if (!validateForm()) {
      Alert.alert(
        "Please Fix Errors",
        "Correct the highlighted fields to continue."
      );
      return;
    }

    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const restingHR = parseInt(formData.restingHeartRate, 10);
      const peakHR = parseInt(formData.peakHeartRate, 10);
      const postHR = parseInt(formData.postActivityHeartRate, 10);
      const hrv = parseInt(formData.hrv, 10);
      const age = parseInt(formData.age, 10);
      const recovery = peakHR - postHR;

      const riskScore = calculateRiskScore();
      const riskData = getRiskLevel(riskScore);

      let report = `${
        riskData.emoji
      } RISK LEVEL: ${riskData.level.toUpperCase()}\n`;
      report += `Score: ${riskScore}/20\n\n`;

      // Key findings
      const findings = [];
      if (restingHR > 100) findings.push("High resting heart rate");
      if (recovery < 12) findings.push("Slow heart rate recovery");
      if (hrv < 20) findings.push("Low heart rate variability");
      if (age > 65) findings.push("Advanced age");
      if (formData.smokingHabit === "yes") findings.push("Current smoking");
      if (formData.dietHabit === "unhealthy") findings.push("Unhealthy diet");
      if (["never", "rarely"].includes(formData.exerciseFrequency))
        findings.push("Insufficient exercise");

      if (findings.length > 0) {
        report += "⚠️ KEY CONCERNS:\n";
        findings.forEach((finding) => (report += `• ${finding}\n`));
        report += "\n";
      }

      // Recommendations
      report += "💡 RECOMMENDATIONS:\n";
      if (riskData.level === "High") {
        report += "• Consult cardiologist immediately\n";
        report += "• Consider cardiac testing\n";
      } else if (riskData.level === "Moderate") {
        report += "• Discuss with your doctor\n";
        report += "• Focus on lifestyle improvements\n";
      } else {
        report += "• Maintain current healthy habits\n";
        report += "• Regular health check-ups\n";
      }

      if (formData.smokingHabit === "yes")
        report += "• Quit smoking (priority #1)\n";
      if (formData.dietHabit === "unhealthy")
        report += "• Improve diet quality\n";
      if (["never", "rarely"].includes(formData.exerciseFrequency))
        report += "• Increase physical activity\n";

      report +=
        "\n⚠️ This is educational only - not medical advice. Consult healthcare professionals for proper diagnosis.";

      Alert.alert("Assessment Results", report, [
        {
          text: "Close",
          onPress: () => {
            setModalVisible(false);
            navigation.navigate("HomeTab");
          },
        },
        { text: "Retake", onPress: () => resetForm() },
      ]);
    } catch (error) {
      Alert.alert("Error", "Assessment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      restingHeartRate: "",
      peakHeartRate: "",
      postActivityHeartRate: "",
      hrv: "",
      smokingHabit: "",
      dietHabit: "",
      age: "",
      gender: "",
      exerciseFrequency: "",
    });
    setErrors({});
    setDropdownVisible({});
  };

  const renderInput = (label, field, placeholder, keyboardType = "default") => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[styles.input, errors[field] && styles.inputError]}
        keyboardType={keyboardType}
        value={formData[field]}
        onChangeText={(value) => handleInputChange(field, value)}
        placeholder={placeholder}
        placeholderTextColor="#A5ADBA"
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  const renderSelect = (label, field) => {
    const selectedOption = selectOptions[field].find(
      (opt) => opt.value === formData[field]
    );

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        <TouchableOpacity
          style={[styles.selectButton, errors[field] && styles.inputError]}
          onPress={() => toggleDropdown(field)}
        >
          <Text
            style={[
              styles.selectText,
              !selectedOption && styles.placeholderText,
            ]}
          >
            {selectedOption ? selectedOption.label : "Select an option"}
          </Text>
          <Text style={styles.dropdownArrow}>
            {dropdownVisible[field] ? "▲" : "▼"}
          </Text>
        </TouchableOpacity>

        {dropdownVisible[field] && (
          <View style={styles.dropdown}>
            {selectOptions[field].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.dropdownItem}
                onPress={() => selectOption(field, option.value)}
              >
                <Text style={styles.dropdownText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.header}>
                <Text style={styles.modalTitle}>❤️ Heart Risk Assessment</Text>
                <Text style={styles.modalSubtitle}>
                  Quick cardiovascular risk evaluation
                </Text>
              </View>

              <View style={styles.form}>
                {renderInput("Age", "age", "e.g., 45", "numeric")}
                {renderSelect("Gender", "gender")}
                {renderInput(
                  "Resting Heart Rate (bpm)",
                  "restingHeartRate",
                  "e.g., 72",
                  "numeric"
                )}
                {renderInput(
                  "Peak Heart Rate After Exercise (bpm)",
                  "peakHeartRate",
                  "e.g., 140",
                  "numeric"
                )}
                {renderInput(
                  "Heart Rate 1 Min After Exercise (bpm)",
                  "postActivityHeartRate",
                  "e.g., 110",
                  "numeric"
                )}
                {renderInput(
                  "Heart Rate Variability (ms)",
                  "hrv",
                  "e.g., 50",
                  "numeric"
                )}
                {renderSelect("Smoking Status", "smokingHabit")}
                {renderSelect("Diet Quality", "dietHabit")}
                {renderSelect("Exercise Frequency", "exerciseFrequency")}
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.submitButton,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={assessRisk}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? "Analyzing..." : "🔍 Analyze Risk"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.cancelButton]}
                  onPress={() => {
                    setModalVisible(false);
                    navigation.navigate("Home");
                  }}
                >
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: width * 0.92,
    maxHeight: "90%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#2D3436",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#636E72",
    textAlign: "center",
  },
  form: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D3436",
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: "#E9ECEF",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    color: "#2D3436",
  },
  inputError: {
    borderColor: "#FF6B6B",
    backgroundColor: "#FFF5F5",
  },
  selectButton: {
    borderWidth: 2,
    borderColor: "#E9ECEF",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectText: {
    fontSize: 16,
    color: "#2D3436",
  },
  placeholderText: {
    color: "#A5ADBA",
  },
  dropdownArrow: {
    fontSize: 12,
    color: "#636E72",
  },
  dropdown: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 8,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F9FA",
  },
  dropdownText: {
    fontSize: 16,
    color: "#2D3436",
  },
  errorText: {
    fontSize: 12,
    color: "#FF6B6B",
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 0,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButton: {
    backgroundColor: "#00B894",
  },
  cancelButton: {
    backgroundColor: "#636E72",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default HeartRiskAssessment;