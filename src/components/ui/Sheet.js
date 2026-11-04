import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts, radius, spacing } from "../../theme";

// ======================================================
// Sheet
// ======================================================
//
// A panel that slides up from the bottom over a dimmed
// screen, for editing one thing (a special day, a walk-in,
// a table). Tapping the dim area closes it.
// ======================================================

export default function Sheet({ visible, onClose, title, children, footer }) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={[styles.flex, styles.backdrop]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable
          style={styles.flex}
          accessibilityLabel="Sluiten"
          onPress={onClose}
        />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.grab} />
          {title ? <Text style={styles.title}>{title}</Text> : null}
          <ScrollView
            style={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  backdrop: {
    backgroundColor: colors.overlay,
  },

  sheet: {
    maxHeight: "88%",
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
  },

  grab: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },

  title: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    color: colors.text,
    marginBottom: spacing.md,
  },

  body: {
    flexGrow: 0,
  },

  footer: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
});
