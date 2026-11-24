import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  PanResponderInstance,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { AppTheme } from '../theme/AppTheme';

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
  deleteConfirmTitle?: string;
  deleteConfirmMessage?: string;
}

interface SwipeableRowState {
  isRevealed: 'DELETE' | 'EDIT' | null;
}

export class SwipeableRow extends React.Component<SwipeableRowProps, SwipeableRowState> {
  private translateX = new Animated.Value(0);
  private panResponder: PanResponderInstance;
  private readonly ACTION_WIDTH = 90;

  constructor(props: SwipeableRowProps) {
    super(props);
    this.state = {
      isRevealed: null,
    };

    this.panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return (
          Math.abs(gestureState.dx) > 12 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.3
        );
      },
      onPanResponderMove: (_, gestureState) => {
        // Swipe to right reveals delete (positive dx), swipe to left reveals edit (negative dx)
        let clampedDx = gestureState.dx;
        if (clampedDx > 120) clampedDx = 120;
        if (clampedDx < -120) clampedDx = -120;
        this.translateX.setValue(clampedDx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 45 && this.props.onDelete) {
          // Reveal Delete Bin on right swipe
          Animated.spring(this.translateX, {
            toValue: this.ACTION_WIDTH,
            useNativeDriver: true,
            bounciness: 4,
          }).start(() => this.setState({ isRevealed: 'DELETE' }));
        } else if (gestureState.dx < -45 && this.props.onEdit) {
          // Reveal Edit on left swipe
          Animated.spring(this.translateX, {
            toValue: -this.ACTION_WIDTH,
            useNativeDriver: true,
            bounciness: 4,
          }).start(() => this.setState({ isRevealed: 'EDIT' }));
        } else {
          this.resetPosition();
        }
      },
      onPanResponderTerminate: () => {
        this.resetPosition();
      },
    });
  }

  public resetPosition = (): void => {
    Animated.spring(this.translateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 6,
    }).start(() => this.setState({ isRevealed: null }));
  };

  private handleConfirmDelete = (): void => {
    const { onDelete, deleteConfirmTitle, deleteConfirmMessage } = this.props;
    if (!onDelete) return;

    Alert.alert(
      deleteConfirmTitle || 'Delete Item',
      deleteConfirmMessage || 'Are you sure you want to remove this record?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => this.resetPosition(),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            this.resetPosition();
            onDelete();
          },
        },
      ]
    );
  };

  private handlePressEdit = (): void => {
    this.resetPosition();
    if (this.props.onEdit) {
      this.props.onEdit();
    }
  };

  public render(): React.ReactNode {
    const { children, onDelete, onEdit } = this.props;

    return (
      <View style={styles.container}>
        {/* Background Action Underlays */}
        <View style={styles.actionsBackgroundLayer}>
          {/* Left Action Underlay (Revealed on Swipe Right -> Delete Bin) */}
          {onDelete && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteAction]}
              onPress={this.handleConfirmDelete}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>🗑️</Text>
              <Text style={styles.actionText}>Delete</Text>
            </TouchableOpacity>
          )}

          <View style={styles.spacer} />

          {/* Right Action Underlay (Revealed on Swipe Left -> Edit Pencil) */}
          {onEdit && (
            <TouchableOpacity
              style={[styles.actionButton, styles.editAction]}
              onPress={this.handlePressEdit}
              activeOpacity={0.8}
            >
              <Text style={styles.actionIcon}>✏️</Text>
              <Text style={styles.actionText}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Foreground Content with Swipe Gesture */}
        <Animated.View
          {...this.panResponder.panHandlers}
          style={[styles.foregroundLayer, { transform: [{ translateX: this.translateX }] }]}
        >
          {children}
        </Animated.View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginVertical: 4,
    overflow: 'hidden',
    borderRadius: 18,
    marginHorizontal: 20,
  },
  actionsBackgroundLayer: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 18,
    overflow: 'hidden',
  },
  deleteAction: {
    backgroundColor: '#FF4D4F',
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editAction: {
    backgroundColor: '#1E6091',
    width: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  spacer: {
    flex: 1,
  },
  foregroundLayer: {
    backgroundColor: 'transparent',
  },
});
