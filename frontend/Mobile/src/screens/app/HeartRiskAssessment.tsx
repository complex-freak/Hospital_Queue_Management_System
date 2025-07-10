import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import { AntDesign } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

interface CoronaryFormData {
  age: string;
  sex: string;
  cp: string;
  trestbps: string;
  chol: string;
  fbs: string;
  restecg: string;
  thalach: string;
  exang: string;
  oldpeak: string;
  ca: string;
  thal: string;
}

interface ArrhythmiaFormData {
  age: string;
  sex: string;
  restingHeartRate: string;
  maxHeartRate: string;
  bpSystolic: string;
  bpDiastolic: string;
  palpitations: string;
  chestPain: string;
  shortnessBreath: string;
  dizziness: string;
  familyHistory: string;
  caffeine: string;
}

interface Errors {
  [key: string]: string | null;
}

interface DropdownVisible {
  [key: string]: boolean;
}

interface SelectOption {
  label: string;
  value: string;
}

const HeartRiskAssessment: React.FC = () => {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState<boolean>(true);
  const [diseaseSelectionVisible, setDiseaseSelectionVisible] =
    useState<boolean>(true);
  const [selectedDisease, setSelectedDisease] = useState<
    "coronary" | "arrhythmia" | null
  >(null);
  const [loading, setLoading] = useState<boolean>(false);

  const [coronaryFormData, setCoronaryFormData] = useState<CoronaryFormData>({
    age: "",
    sex: "",
    cp: "",
    trestbps: "",
    chol: "",
    fbs: "",
    restecg: "",
    thalach: "",
    exang: "",
    oldpeak: "",
    ca: "",
    thal: "",
  });

  const [arrhythmiaFormData, setArrhythmiaFormData] =
    useState<ArrhythmiaFormData>({
      age: "",
      sex: "",
      restingHeartRate: "",
      maxHeartRate: "",
      bpSystolic: "",
      bpDiastolic: "",
      palpitations: "",
      chestPain: "",
      shortnessBreath: "",
      dizziness: "",
      familyHistory: "",
      caffeine: "",
    });

  const [errors, setErrors] = useState<Errors>({});
  const [dropdownVisible, setDropdownVisible] = useState<DropdownVisible>({});

  const selectOptions: { [key: string]: SelectOption[] } = {
    sex: [
      { label: "Male", value: "1" },
      { label: "Female", value: "0" },
    ],
    cp: [
      { label: "Sharp chest pain", value: "0" },
      { label: "Mild chest pain", value: "1" },
      { label: "Other chest discomfort", value: "2" },
      { label: "No chest pain", value: "3" },
    ],
    fbs: [
      { label: "Yes", value: "1" },
      { label: "No", value: "0" },
    ],
    restecg: [
      { label: "Normal", value: "0" },
      { label: "Abnormal wave pattern", value: "1" },
      { label: "Thicker heart muscle", value: "2" },
    ],
    exang: [
      { label: "Yes", value: "1" },
      { label: "No", value: "0" },
    ],
    ca: [
      { label: "0", value: "0" },
      { label: "1", value: "1" },
      { label: "2", value: "2" },
      { label: "3", value: "3" },
    ],
    thal: [
      { label: "Normal", value: "1" },
      { label: "Fixed issue", value: "2" },
      { label: "Reversible issue", value: "3" },
    ],
    palpitations: [
      { label: "Yes", value: "1" },
      { label: "No", value: "0" },
    ],
    chestPain: [
      { label: "Yes", value: "1" },
      { label: "No", value: "0" },
    ],
    shortnessBreath: [
      { label: "Yes", value: "1" },
      { label: "No", value: "0" },
    ],
    dizziness: [
      { label: "Yes", value: "1" },
      { label: "No", value: "0" },
    ],
    familyHistory: [
      { label: "Yes", value: "1" },
      { label: "No", value: "0" },
    ],
    caffeine: [
      { label: "None", value: "0" },
      { label: "1-2 cups/day", value: "1" },
      { label: "3-4 cups/day", value: "2" },
      { label: "5+ cups/day", value: "3" },
    ],
  };

  const handleCoronaryInputChange = (
    field: keyof CoronaryFormData,
    value: string
  ) => {
    setCoronaryFormData({ ...coronaryFormData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const handleArrhythmiaInputChange = (
    field: keyof ArrhythmiaFormData,
    value: string
  ) => {
    setArrhythmiaFormData({ ...arrhythmiaFormData, [field]: value });
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const toggleDropdown = (field: string) => {
    setDropdownVisible({
      ...dropdownVisible,
      [field]: !dropdownVisible[field],
    });
  };

  const selectOption = (field: string, value: string) => {
    if (selectedDisease === "coronary") {
      handleCoronaryInputChange(field as keyof CoronaryFormData, value);
    } else {
      handleArrhythmiaInputChange(field as keyof ArrhythmiaFormData, value);
    }
    setDropdownVisible({ ...dropdownVisible, [field]: false });
  };

  const validateCoronaryForm = () => {
    const newErrors: Errors = {};

    const numericFields: {
      [key: string]: { min: number; max: number; message: string };
    } = {
      age: { min: 18, max: 100, message: "Age must be between 18 and 100" },
      trestbps: {
        min: 80,
        max: 200,
        message: "Resting blood pressure must be between 80 and 200 mmHg",
      },
      chol: {
        min: 100,
        max: 600,
        message: "Cholesterol must be between 100 and 600 mg/dl",
      },
      thalach: {
        min: 60,
        max: 220,
        message: "Highest heart rate must be between 60 and 220 bpm",
      },
      oldpeak: {
        min: 0,
        max: 10,
        message: "Heart activity change must be between 0 and 10",
      },
    };

    Object.entries(numericFields).forEach(([field, config]) => {
      const value = parseFloat(
        coronaryFormData[field as keyof CoronaryFormData]
      );
      if (
        !coronaryFormData[field as keyof CoronaryFormData] ||
        isNaN(value) ||
        value < config.min ||
        value > config.max
      ) {
        newErrors[field] = config.message;
      }
    });

    const age = parseInt(coronaryFormData.age, 10);
    const thalach = parseInt(coronaryFormData.thalach, 10);
    if (!isNaN(age) && !isNaN(thalach) && thalach > 220 - age) {
      newErrors.thalach = `Highest heart rate must not exceed ${
        220 - age
      } bpm (220 - age)`;
    }

    const selectFields: (keyof CoronaryFormData)[] = [
      "sex",
      "cp",
      "fbs",
      "restecg",
      "exang",
      "ca",
      "thal",
    ];
    selectFields.forEach((field) => {
      if (!coronaryFormData[field]) {
        newErrors[field] = "Please select an option";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateArrhythmiaForm = () => {
    const newErrors: Errors = {};

    const numericFields: {
      [key: string]: { min: number; max: number; message: string };
    } = {
      age: { min: 18, max: 100, message: "Age must be between 18 and 100" },
      restingHeartRate: {
        min: 40,
        max: 120,
        message: "Resting heart rate must be between 40 and 120 bpm",
      },
      maxHeartRate: {
        min: 60,
        max: 220,
        message: "Highest heart rate must be between 60 and 220 bpm",
      },
      bpSystolic: {
        min: 80,
        max: 200,
        message: "Upper blood pressure must be between 80 and 200 mmHg",
      },
      bpDiastolic: {
        min: 50,
        max: 120,
        message: "Lower blood pressure must be between 50 and 120 mmHg",
      },
    };

    Object.entries(numericFields).forEach(([field, config]) => {
      const value = parseInt(
        arrhythmiaFormData[field as keyof ArrhythmiaFormData],
        10
      );
      if (
        !arrhythmiaFormData[field as keyof ArrhythmiaFormData] ||
        isNaN(value) ||
        value < config.min ||
        value > config.max
      ) {
        newErrors[field] = config.message;
      }
    });

    const age = parseInt(arrhythmiaFormData.age, 10);
    const maxHR = parseInt(arrhythmiaFormData.maxHeartRate, 10);
    if (!isNaN(age) && !isNaN(maxHR) && maxHR > 220 - age) {
      newErrors.maxHeartRate = `Highest heart rate must not exceed ${
        220 - age
      } bpm (220 - age)`;
    }

    const selectFields: (keyof ArrhythmiaFormData)[] = [
      "sex",
      "palpitations",
      "chestPain",
      "shortnessBreath",
      "dizziness",
      "familyHistory",
      "caffeine",
    ];
    selectFields.forEach((field) => {
      if (!arrhythmiaFormData[field]) {
        newErrors[field] = "Please select an option";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateCoronaryRiskScore = () => {
    const weights = {
      age: 0.025,
      sex: 0.8,
      cp: [-0.7, -0.3, 0.2, 0.8],
      trestbps: 0.008,
      chol: 0.002,
      fbs: 0.3,
      restecg: [0, 0.4, 0.6],
      thalach: -0.01,
      exang: 0.9,
      oldpeak: 0.4,
      ca: 0.7,
      thal: [0, 0.5, 1.0],
    };
    const bias = -2.5;

    let score = bias;
    const age = parseInt(coronaryFormData.age, 10);
    score += age * weights.age;
    score += parseInt(coronaryFormData.sex, 10) * weights.sex;
    score += weights.cp[parseInt(coronaryFormData.cp, 10)];
    score +=
      Math.max(0, parseInt(coronaryFormData.trestbps, 10) - 120) *
      weights.trestbps;
    score +=
      Math.max(0, parseInt(coronaryFormData.chol, 10) - 200) * weights.chol;
    score += parseInt(coronaryFormData.fbs, 10) * weights.fbs;
    score += weights.restecg[parseInt(coronaryFormData.restecg, 10)];
    score +=
      (220 - age - parseInt(coronaryFormData.thalach, 10)) * weights.thalach;
    score += parseInt(coronaryFormData.exang, 10) * weights.exang;
    score += parseFloat(coronaryFormData.oldpeak) * weights.oldpeak;
    score += parseInt(coronaryFormData.ca, 10) * weights.ca;
    score += weights.thal[parseInt(coronaryFormData.thal, 10) - 1];
    const probability = 1 / (1 + Math.exp(-score));
    return { probability, riskFactors: getCoronaryRiskFactors() };
  };

  const calculateArrhythmiaRiskScore = () => {
    const weights = {
      age: 0.02,
      sex: 0.3,
      restingHeartRate: 0.015,
      maxHeartRate: -0.008,
      bpSystolic: 0.005,
      bpDiastolic: 0.008,
      palpitations: 1.2,
      chestPain: 0.8,
      shortnessBreath: 0.9,
      dizziness: 1.0,
      familyHistory: 0.7,
      caffeine: 0.3,
    };
    const bias = -3.0;

    let score = bias;
    const age = parseInt(arrhythmiaFormData.age, 10);
    score += age * weights.age;
    score += parseInt(arrhythmiaFormData.sex, 10) * weights.sex;
    score +=
      Math.abs(parseInt(arrhythmiaFormData.restingHeartRate, 10) - 70) *
      weights.restingHeartRate;
    score +=
      (220 - age - parseInt(arrhythmiaFormData.maxHeartRate, 10)) *
      weights.maxHeartRate;
    score +=
      Math.max(0, parseInt(arrhythmiaFormData.bpSystolic, 10) - 140) *
      weights.bpSystolic;
    score +=
      Math.max(0, parseInt(arrhythmiaFormData.bpDiastolic, 10) - 90) *
      weights.bpDiastolic;
    score +=
      parseInt(arrhythmiaFormData.palpitations, 10) * weights.palpitations;
    score += parseInt(arrhythmiaFormData.chestPain, 10) * weights.chestPain;
    score +=
      parseInt(arrhythmiaFormData.shortnessBreath, 10) *
      weights.shortnessBreath;
    score += parseInt(arrhythmiaFormData.dizziness, 10) * weights.dizziness;
    score +=
      parseInt(arrhythmiaFormData.familyHistory, 10) * weights.familyHistory;
    score += parseInt(arrhythmiaFormData.caffeine, 10) * weights.caffeine;

    const probability = 1 / (1 + Math.exp(-score));
    return { probability, riskFactors: getArrhythmiaRiskFactors() };
  };

  const getCoronaryRiskFactors = () => {
    const factors: string[] = [];
    const age = parseInt(coronaryFormData.age, 10);
    const trestbps = parseInt(coronaryFormData.trestbps, 10);
    const chol = parseInt(coronaryFormData.chol, 10);
    const oldpeak = parseFloat(coronaryFormData.oldpeak);
    const ca = parseInt(coronaryFormData.ca, 10);

    if (chol > 240) factors.push("High cholesterol (above 240 mg/dl)");
    if (trestbps > 140) factors.push("High blood pressure (above 140 mmHg)");
    if (parseInt(coronaryFormData.exang, 10) === 1)
      factors.push("Chest pain during exercise");
    if (oldpeak > 1) factors.push("Abnormal heart activity during stress test");
    if (ca > 0) factors.push(`${ca} blocked blood vessel(s)`);
    if (parseInt(coronaryFormData.thal, 10) === 3)
      factors.push("Abnormal heart stress test result");
    if (age > 60) factors.push("Age over 60 years");
    return factors;
  };

  const getArrhythmiaRiskFactors = () => {
    const factors: string[] = [];
    const age = parseInt(arrhythmiaFormData.age, 10);
    const restingHR = parseInt(arrhythmiaFormData.restingHeartRate, 10);
    const bpSystolic = parseInt(arrhythmiaFormData.bpSystolic, 10);
    const bpDiastolic = parseInt(arrhythmiaFormData.bpDiastolic, 10);

    if (parseInt(arrhythmiaFormData.palpitations, 10) === 1)
      factors.push("Feeling heart racing or skipping");
    if (parseInt(arrhythmiaFormData.dizziness, 10) === 1)
      factors.push("Dizziness or fainting");
    if (parseInt(arrhythmiaFormData.shortnessBreath, 10) === 1)
      factors.push("Shortness of breath");
    if (parseInt(arrhythmiaFormData.chestPain, 10) === 1)
      factors.push("Chest pain during activity");
    if (parseInt(arrhythmiaFormData.familyHistory, 10) === 1)
      factors.push("Family history of irregular heartbeats");
    if (parseInt(arrhythmiaFormData.caffeine, 10) > 1)
      factors.push("High coffee or tea intake (3+ cups/day)");
    if (restingHR > 100 || restingHR < 60)
      factors.push("Unusual resting heart rate");
    if (bpSystolic > 140 || bpDiastolic > 90)
      factors.push("High blood pressure");
    return factors;
  };

  const getRiskLevel = (probability: number) => {
    if (selectedDisease === "coronary") {
      if (probability >= 0.7)
        return { level: "High", color: "#E74C3C", emoji: "🔴" };
      if (probability >= 0.3)
        return { level: "Moderate", color: "#F39C12", emoji: "🟡" };
      return { level: "Low", color: "#2ECC71", emoji: "🟢" };
    } else {
      if (probability >= 0.65)
        return { level: "High", color: "#E74C3C", emoji: "🔴" };
      if (probability >= 0.25)
        return { level: "Moderate", color: "#F39C12", emoji: "🟡" };
      return { level: "Low", color: "#2ECC71", emoji: "🟢" };
    }
  };

  const assessRisk = async () => {
    let isValid = false;
    let riskData;
    let probability;
    let riskFactors: string[] = [];

    if (selectedDisease === "coronary") {
      isValid = validateCoronaryForm();
      if (isValid) {
        const result = calculateCoronaryRiskScore();
        probability = result.probability;
        riskFactors = result.riskFactors;
        riskData = getRiskLevel(probability);
      }
    } else {
      isValid = validateArrhythmiaForm();
      if (isValid) {
        const result = calculateArrhythmiaRiskScore();
        probability = result.probability;
        riskFactors = result.riskFactors;
        riskData = getRiskLevel(probability);
      }
    }

    if (!isValid) {
      return;
    }

    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const diseaseName =
        selectedDisease === "coronary"
          ? "Blocked Heart Arteries"
          : "Irregular Heartbeats";
      let report = `${
        riskData.emoji
      } Risk Level: ${riskData.level.toUpperCase()} (${(
        probability * 100
      ).toFixed(1)}%)\n\n`;

      if (riskFactors.length > 0) {
        report += "⚠️ Key Concerns:\n";
        riskFactors.forEach((factor) => (report += `• ${factor}\n`));
        report += "\n";
      }

      report += "💡 Recommendations:\n";
      if (riskData.level === "High") {
        report += "• Consult a cardiologist immediately\n";
        report += `• Consider cardiac testing (e.g., ${
          selectedDisease === "coronary" ? "angiogram" : "ECG"
        })\n`;
      } else if (riskData.level === "Moderate") {
        report += "• Discuss with your doctor\n";
        report += "• Focus on lifestyle changes (e.g., diet, exercise)\n";
      } else {
        report += "• Maintain healthy habits\n";
        report += "• Schedule regular check-ups\n";
      }

      if (
        (selectedDisease === "arrhythmia" &&
          (parseInt(arrhythmiaFormData.palpitations, 10) === 1 ||
            parseInt(arrhythmiaFormData.dizziness, 10) === 1)) ||
        (selectedDisease === "coronary" &&
          parseInt(coronaryFormData.exang, 10) === 1)
      ) {
        report += "• Monitor symptoms and seek medical advice\n";
      }
      if (
        selectedDisease === "arrhythmia" &&
        parseInt(arrhythmiaFormData.caffeine, 10) > 1
      ) {
        report += "• Reduce caffeine intake\n";
      }

      report +=
        "\n⚠️ This is an educational tool, not a medical diagnosis. Consult a healthcare professional for accurate assessment. Learn more at heart.org or mayoclinic.org.";

      Alert.alert(`${diseaseName} Risk Assessment Results`, report, [
        {
          text: "Close",
          onPress: () => {
            setModalVisible(false);
            navigation.navigate("HomeTab" as never);
          },
        },
        { text: "Retake", onPress: resetForm },
      ]);
    } catch (error) {
      Alert.alert("Error", "Assessment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (selectedDisease === "coronary") {
      setCoronaryFormData({
        age: "",
        sex: "",
        cp: "",
        trestbps: "",
        chol: "",
        fbs: "",
        restecg: "",
        thalach: "",
        exang: "",
        oldpeak: "",
        ca: "",
        thal: "",
      });
    } else {
      setArrhythmiaFormData({
        age: "",
        sex: "",
        restingHeartRate: "",
        maxHeartRate: "",
        bpSystolic: "",
        bpDiastolic: "",
        palpitations: "",
        chestPain: "",
        shortnessBreath: "",
        dizziness: "",
        familyHistory: "",
        caffeine: "",
      });
    }
    setErrors({});
    setDropdownVisible({});
  };

  const renderInput = (
    label: string,
    field: keyof CoronaryFormData | keyof ArrhythmiaFormData,
    placeholder: string,
    keyboardType: "default" | "numeric" | "decimal-pad" = "default"
  ) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel} accessibilityLabel={label}>
        {label}
      </Text>
      <TextInput
        style={[styles.input, errors[field] && styles.inputError]}
        keyboardType={keyboardType}
        value={
          selectedDisease === "coronary"
            ? coronaryFormData[field as keyof CoronaryFormData]
            : arrhythmiaFormData[field as keyof ArrhythmiaFormData]
        }
        onChangeText={(value) =>
          selectedDisease === "coronary"
            ? handleCoronaryInputChange(field as keyof CoronaryFormData, value)
            : handleArrhythmiaInputChange(
                field as keyof ArrhythmiaFormData,
                value
              )
        }
        placeholder={placeholder}
        placeholderTextColor="#A5ADBA"
        accessibilityLabel={`${label} input`}
        accessibilityRole="text"
      />
      {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
    </View>
  );

  const renderSelect = (
    label: string,
    field: keyof CoronaryFormData | keyof ArrhythmiaFormData
  ) => {
    const selectedOption = selectOptions[field].find(
      (opt) =>
        opt.value ===
        (selectedDisease === "coronary"
          ? coronaryFormData[field as keyof CoronaryFormData]
          : arrhythmiaFormData[field as keyof ArrhythmiaFormData])
    );

    return (
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel} accessibilityLabel={label}>
          {label}
        </Text>
        <TouchableOpacity
          style={[styles.selectButton, errors[field] && styles.inputError]}
          onPress={() => toggleDropdown(field)}
          accessibilityLabel={`${label} dropdown`}
          accessibilityRole="button"
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
          <Animated.View
            entering={FadeInUp}
            exiting={FadeOutUp}
            style={styles.dropdown}
          >
            {selectOptions[field].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.dropdownItem}
                onPress={() => selectOption(field, option.value)}
                accessibilityLabel={option.label}
                accessibilityRole="menuitem"
              >
                <Text style={styles.dropdownText}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {errors[field] && <Text style={styles.errorText}>{errors[field]}</Text>}
      </View>
    );
  };

  const renderDiseaseSelection = () => (
    <View style={styles.diseaseSelectionContainer}>
      <Text style={styles.modalTitle}>🫀 Heart Health Checker</Text>
      <Text style={styles.modalSubtitle}>
        Choose a heart condition to explore
      </Text>
      <View style={styles.diseaseButtons}>
        <TouchableOpacity
          style={[
            styles.diseaseButton,
            selectedDisease === "coronary" && styles.activeDiseaseButton,
          ]}
          onPress={() => {
            setSelectedDisease("coronary");
            setDiseaseSelectionVisible(false);
          }}
          accessibilityLabel="Check Blocked Heart Arteries Risk"
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.diseaseButtonText,
              selectedDisease === "coronary" && styles.activeDiseaseButtonText,
            ]}
          >
            🩸 Blocked Heart Arteries
          </Text>
          <Text style={styles.accuracyBadge}>
            93% Model Accuracy (Illustrative)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.diseaseButton,
            selectedDisease === "arrhythmia" && styles.activeDiseaseButton,
          ]}
          onPress={() => {
            setSelectedDisease("arrhythmia");
            setDiseaseSelectionVisible(false);
          }}
          accessibilityLabel="Check Irregular Heartbeats Risk"
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.diseaseButtonText,
              selectedDisease === "arrhythmia" &&
                styles.activeDiseaseButtonText,
            ]}
          >
            💓 Irregular Heartbeats
          </Text>
          <Text style={styles.accuracyBadge}>
            85% Model Accuracy (Illustrative)
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.button, styles.cancelButton]}
        onPress={() => {
          setModalVisible(false);
          navigation.navigate("HomeTab" as never);
        }}
        accessibilityLabel="Cancel assessment"
        accessibilityRole="button"
      >
        <Text style={styles.buttonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCoronaryForm = () => (
    <View style={styles.form}>
      {renderInput("Age (years)", "age", "e.g., 45", "numeric")}
      {renderSelect("Sex", "sex")}
      {renderSelect("Chest Pain Type", "cp")}
      {renderInput(
        "Resting Blood Pressure (mmHg)",
        "trestbps",
        "e.g., 120",
        "numeric"
      )}
      {renderInput("Cholesterol (mg/dl)", "chol", "e.g., 200", "numeric")}
      {renderSelect("High Blood Sugar (>120 mg/dl)", "fbs")}
      {renderSelect("Heart Rhythm at Rest", "restecg")}
      {renderInput(
        "Highest Heart Rate (bpm)",
        "thalach",
        "e.g., 150",
        "numeric"
      )}
      {renderSelect("Chest Pain During Exercise", "exang")}
      {renderInput(
        "Heart Activity Change",
        "oldpeak",
        "e.g., 1",
        "decimal-pad"
      )}
      {renderSelect("Blocked Blood Vessels (0-3)", "ca")}
      {renderSelect("Heart Stress Test Result", "thal")}
    </View>
  );

  const renderArrhythmiaForm = () => (
    <View style={styles.form}>
      {renderInput("Age (years)", "age", "e.g., 45", "numeric")}
      {renderSelect("Sex", "sex")}
      {renderInput(
        "Resting Heart Rate (bpm)",
        "restingHeartRate",
        "e.g., 70",
        "numeric"
      )}
      {renderInput(
        "Highest Heart Rate (bpm)",
        "maxHeartRate",
        "e.g., 150",
        "numeric"
      )}
      {renderInput(
        "Upper Blood Pressure (mmHg)",
        "bpSystolic",
        "e.g., 120",
        "numeric"
      )}
      {renderInput(
        "Lower Blood Pressure (mmHg)",
        "bpDiastolic",
        "e.g., 80",
        "numeric"
      )}
      {renderSelect("Feel Heart Racing or Skipping", "palpitations")}
      {renderSelect("Chest Pain During Activity", "chestPain")}
      {renderSelect("Shortness of Breath", "shortnessBreath")}
      {renderSelect("Dizziness or Fainting", "dizziness")}
      {renderSelect("Family History of Irregular Heartbeats", "familyHistory")}
      {renderSelect("Daily Coffee or Tea Intake", "caffeine")}
    </View>
  );

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
          <Animated.View
            entering={FadeInUp.duration(300)}
            style={styles.modalContent}
          >
            {diseaseSelectionVisible ? (
              renderDiseaseSelection()
            ) : (
              <>
                <View style={styles.header}>
                  <Text style={styles.modalTitle}>
                    🫀{" "}
                    {selectedDisease === "coronary"
                      ? "Blocked Heart Arteries"
                      : "Irregular Heartbeats"}{" "}
                    Assessment
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Evaluate your risk for{" "}
                    {selectedDisease === "coronary"
                      ? "coronary artery disease"
                      : "arrhythmia"}
                  </Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => {
                      setModalVisible(false);
                      navigation.navigate("HomeTab" as never);
                    }}
                    accessibilityLabel="Close assessment"
                    accessibilityRole="button"
                  >
                    <AntDesign name="close" size={24} color="#2D3436" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {selectedDisease === "coronary"
                    ? renderCoronaryForm()
                    : renderArrhythmiaForm()}

                  <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerText}>
                      ⚠️ This tool is for educational purposes only and is not a
                      medical diagnosis. Consult a healthcare professional for
                      accurate assessment.
                    </Text>
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
                      accessibilityLabel="Analyze heart risk"
                      accessibilityRole="button"
                    >
                      {loading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.buttonText}>🔍 Analyze Risk</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.cancelButton]}
                      onPress={() => {
                        setModalVisible(false);
                        navigation.navigate("HomeTab" as never);
                      }}
                      accessibilityLabel="Cancel assessment"
                      accessibilityRole="button"
                    >
                      <Text style={styles.buttonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </>
            )}
          </Animated.View>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: width * 0.9,
    maxHeight: height * 0.85,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E9ECEF",
    position: "relative",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2D3436",
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#636E72",
    textAlign: "center",
    marginTop: 8,
  },
  closeButton: {
    position: "absolute",
    right: 20,
    top: 20,
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
    padding: 14,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    color: "#2D3436",
  },
  inputError: {
    borderColor: "#E74C3C",
    backgroundColor: "#FFF5F5",
  },
  selectButton: {
    borderWidth: 2,
    borderColor: "#E9ECEF",
    borderRadius: 12,
    padding: 14,
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
    fontSize: 14,
    color: "#636E72",
  },
  dropdown: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E9ECEF",
    borderRadius: 12,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F8F9FA",
  },
  dropdownText: {
    fontSize: 16,
    color: "#2D3436",
  },
  errorText: {
    fontSize: 12,
    color: "#E74C3C",
    marginTop: 4,
  },
  disclaimer: {
    backgroundColor: "#FFF3CD",
    padding: 14,
    margin: 20,
    marginTop: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFEEBA",
  },
  disclaimerText: {
    fontSize: 12,
    color: "#856404",
    textAlign: "center",
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
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButton: {
    backgroundColor: "#3498DB",
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
  diseaseSelectionContainer: {
    padding: 20,
    alignItems: "center",
  },
  diseaseButtons: {
    marginVertical: 20,
    width: "100%",
  },
  diseaseButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 3,
    borderColor: "#3498DB",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    alignItems: "center",
  },
  activeDiseaseButton: {
    backgroundColor: "#3498DB",
  },
  diseaseButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#3498DB",
  },
  activeDiseaseButtonText: {
    color: "#FFFFFF",
  },
  accuracyBadge: {
    fontSize: 12,
    color: "#636E72",
    marginTop: 5,
  },
});

export default HeartRiskAssessment;
