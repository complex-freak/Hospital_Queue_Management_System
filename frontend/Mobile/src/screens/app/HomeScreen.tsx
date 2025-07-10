import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

const HomeScreen = () => {
  const navigation = useNavigation();

  const quickActions = [
    {
      title: "Appointments",
      description: "View and manage your upcoming medical appointments",
      icon: "calendar",
      screen: "Appointments",
      color: "#2684FF",
      bgColor: "#DEEBFF",
    },
    {
      title: "Clinician Recommendations",
      description: "Review health guidance from your healthcare providers",
      icon: "medkit",
      screen: "ClinicianRecommendations",
      color: "#36B37E",
      bgColor: "#E3FCEF",
    },
    {
      title: "Health Data",
      description: "Track and record your health metrics",
      icon: "heart",
      screen: "Health",
      color: "#FF5630",
      bgColor: "#FFEBE6",
    },
    {
      title: "Risk Assessment",
      description: "Check your cardiovascular risk assessment",
      icon: "analytics",
      screen: "RiskVisualization",
      color: "#FFAB00",
      bgColor: "#FFFAE6",
    },
    {
      title: "Heart Disease Risk Assessment",
      description: "Simulate your risk of heart disease with a quick survey",
      icon: "pulse",
      screen: "HeartRiskAssessment",
      color: "#C70039",
      bgColor: "#FFE6E6",
    },
    {
      title: "Messages",
      description: "Communicate with your healthcare team",
      icon: "chatbubbles",
      screen: "Messages",
      color: "#6554C0",
      bgColor: "#EAE6FF",
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, Witness</Text>
          <Text style={styles.subtitle}>How are you feeling today?</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summary}>
          <Text style={styles.sectionTitle}>Health Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Blood Pressure</Text>
                <Text style={styles.summaryValue}>120/80</Text>
                <Text style={styles.summaryNormal}>Normal</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Heart Rate</Text>
                <Text style={styles.summaryValue}>72 bpm</Text>
                <Text style={styles.summaryNormal}>Normal</Text>
              </View>
            </View>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Blood Sugar</Text>
                <Text style={styles.summaryValue}>98 mg/dL</Text>
                <Text style={styles.summaryNormal}>Normal</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>CVD Risk</Text>
                <Text style={styles.summaryValue}>Moderate</Text>
                <Text style={styles.summaryDate}>Updated 3 days ago</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.upcoming}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Appointment</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate("Appointments")}
            >
              <Text style={styles.viewAll}>View all</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.appointmentCard}
            onPress={() => navigation.navigate("Appointments")}
          >
            <View style={styles.appointmentDateBox}>
              <Text style={styles.appointmentMonth}>DEC</Text>
              <Text style={styles.appointmentDay}>15</Text>
            </View>
            <View style={styles.appointmentDetails}>
              <Text style={styles.appointmentTitle}>
                Annual Cardiovascular Checkup
              </Text>
              <Text style={styles.appointmentTime}>
                10:00 AM with Dr. Sarah Johnson
              </Text>
              <Text style={styles.appointmentLocation}>HeartCare Clinic</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsContainer}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={() => navigation.navigate(action.screen)}
            >
              <View
                style={[styles.actionIcon, { backgroundColor: action.bgColor }]}
              >
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={styles.actionTitle}>{action.title}</Text>
              <Text style={styles.actionDescription} numberOfLines={2}>
                {action.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F4F5F7",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 70,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#091E42",
  },
  subtitle: {
    fontSize: 16,
    color: "#5E6C84",
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  summary: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#091E42",
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "#F4F5F7",
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#5E6C84",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#091E42",
    marginBottom: 4,
  },
  summaryNormal: {
    fontSize: 12,
    color: "#36B37E",
  },
  summaryDate: {
    fontSize: 12,
    color: "#97A0AF",
  },
  upcoming: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  viewAll: {
    fontSize: 14,
    color: "#2684FF",
  },
  appointmentCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  appointmentDateBox: {
    width: 50,
    height: 60,
    backgroundColor: "#DEEBFF",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  appointmentMonth: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2684FF",
  },
  appointmentDay: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2684FF",
  },
  appointmentDetails: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#091E42",
    marginBottom: 4,
  },
  appointmentTime: {
    fontSize: 14,
    color: "#5E6C84",
    marginBottom: 2,
  },
  appointmentLocation: {
    fontSize: 14,
    color: "#97A0AF",
  },
  actionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  actionCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#091E42",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 12,
    color: "#5E6C84",
    lineHeight: 16,
  },
});

export default HomeScreen;
