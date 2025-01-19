import React, { useState, useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Linking,
  Clipboard,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getSecretStorage = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Error reading from storage:', error);
    return null;
  }
};

const setSecretStorage = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error writing to storage:', error);
  }
};

const useAudioRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  
  const startRecording = async () => {
    setIsRecording(true);
    Alert.alert('Not Implemented', 'Audio recording is not implemented in this version');
  };
  
  const stopRecording = async () => {
    setIsRecording(false);
    return { base64Audio: null };
  };
  
  return [isRecording, startRecording, stopRecording];
};

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

const RootApp = () => {
  const copyToClipboard = async (text, index) => {
    try {
      await Clipboard.setString(text);

      setMessages((prevMessages) =>
        prevMessages.map((message, i) =>
          i === index ? { ...message, isHighlighted: true } : message,
        ),
      );

      setTimeout(() => {
        setMessages((prevMessages) =>
          prevMessages.map((message, i) =>
            i === index ? { ...message, isHighlighted: false } : message,
          ),
        );
      }, 1000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      Alert.alert('Error', 'Text could not be copied');
    }
  };

  const saveCurrentChat = async () => {
    if (messages.length > 0) {
      let chatName = '';
      try {
        const prompt = `Using DeepSeek V3, generate a short and meaningful title for the following conversation:\n\n${messages.map((m) => (m.isUser ? 'User: ' : 'AI: ') + m.text).join('\n')}`;
        const response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            messages: [{ role: 'user', content: prompt }],
            model: 'deepseek/deepseek-chat',
          },
          {
            headers: { Authorization: `Bearer ${openRouterApiKey}` },
          },
        );
        chatName = response.data.choices[0].message.content.trim();
      } catch (error) {
        console.error('Error generating chat name with DeepSeek:', error);
        chatName = `Chat from ${new Date().toLocaleString()}`;
      }

      const currentDateTime = new Date().toLocaleString();
      chatName = `${chatName} (${currentDateTime})`;

      const currentChatId = Date.now();

      setChatHistory((prevHistory) => {
        const existingChatIndex = prevHistory.findIndex(
          (history) =>
            JSON.stringify(history.messages) === JSON.stringify(messages),
        );

        if (existingChatIndex !== -1) {
          const updatedHistory = [...prevHistory];
          updatedHistory[existingChatIndex] = {
            ...updatedHistory[existingChatIndex],
            messages,
            name: chatName,
          };
          return updatedHistory;
        }

        return [
          ...prevHistory,
          { id: currentChatId, messages, name: chatName },
        ];
      });

      setMessages([]);
    }
  };

  const viewChatHistory = (history) => {
    setChatHistory((prevHistory) => {
      const existingChatIndex = prevHistory.findIndex(
        (prev) => prev.id === history.id,
      );

      if (existingChatIndex !== -1) {
        const updatedHistory = [...prevHistory];
        updatedHistory[existingChatIndex] = history;
        return updatedHistory;
      }

      return [...prevHistory, history];
    });

    setMessages(history.messages);
    setIsHistoryModalVisible(false);
  };

  const deleteChatHistory = (id) => {
    setChatHistory((prevHistory) =>
      prevHistory.filter((history) => history.id !== id),
    );
  };

  const copyCodeToClipboard = async (codeText) => {
    try {
      await Clipboard.setString(codeText);

      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (error) {
      console.error('Error copying code to clipboard:', error);
    }
  };

  const addNewModel = () => {
    const validationKey = getApiValidationKey(selectedApi);
    if (apiValidationStatus[validationKey] !== 'success') {
      Alert.alert(
        'Error',
        'Please ensure that a valid API key is available for this provider.',
      );
      return;
    }

    if (
      !newModelName.trim() ||
      !newModelValue.trim() ||
      !newModelShortName.trim()
    ) {
      Alert.alert(
        'Error',
        'Please fill in all fields to add a new model.',
      );
      return;
    }

    setAvailableModels((prevModels) => [
      ...prevModels,
      {
        name: newModelName,
        value: newModelValue,
        api: selectedApi,
        shortName: newModelShortName,
      },
    ]);

    setNewModelName('');
    setNewModelValue('');
    setNewModelShortName('');
    setIsAddingNewModel(false);
  };

  const deleteModel = (modelValue) => {
    setAvailableModels((prevModels) =>
      prevModels.filter((model) => model.value !== modelValue),
    );
  };

  const getApiValidationKey = (api) => {
    switch(api) {
      case 'google': return 'google';
      case 'openrouter': return 'openRouter';
      case 'cerebras': return 'cerebras';
      case 'lemonfox': return 'lemonfox';
      case 'openai': return 'openai';
      default: return '';
    }
  };

  const [availableModels, setAvailableModels] = useState([
    {
      name: '4o Mini',
      value: 'gpt-4',
      api: 'openai',
      shortName: 'M',
      quickAccess: true,
    },
    {
      name: 'DeepSeek V3',
      value: 'deepseek/deepseek-chat',
      api: 'openrouter',
      shortName: 'D',
      quickAccess: true,
    },

    {
      name: 'Gemini 2.0',
      value: 'gemini-2.0-flash-exp',
      api: 'google',
      shortName: 'F',
      quickAccess: true,
    },
    {
      name: 'Gemini 2.0 Flash Thinking Exp',
      value: 'gemini-2.0-flash-thinking-exp-1219',
      api: 'google',
      shortName: 'T',
      quickAccess: true,
    },
    {
      name: 'Llama 3.3',
      value: 'meta-llama/llama-3.3-70b-instruct',
      api: 'openrouter',
      shortName: 'L',
      quickAccess: true,
    },
    {
      name: 'Cerebras Llama 3.3',
      value: 'llama-3.3-70b',
      api: 'cerebras',
      shortName: 'C',
      quickAccess: true,
    },
  ]);
  const [quickAccessModels, setQuickAccessModels] = useState([]);

  const toggleQuickAccess = (modelValue) => {
    setAvailableModels((prevModels) =>
      prevModels.map((model) =>
        model.value === modelValue
          ? { ...model, quickAccess: !model.quickAccess }
          : model,
      ),
    );
  };
  const [selectedApi, setSelectedApi] = useState('openrouter');
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash-exp');
  const [selectedModelName, setSelectedModelName] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleApiSelection = (api) => {
    setSelectedApi(api);
    setSelectedModel('');
  };

  const showSelectedModelName = (name) => {
    setSelectedModelName(name);
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        delay: 1000,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleModelSelection = (model) => {
    setSelectedModel(model.value);
    showSelectedModelName(model.name);
  };
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
const [copyFeedback, setCopyFeedback] = useState(false);
const scrollViewRef = useRef(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);

      const [googleApiKey, setGoogleApiKey] = useState(null);
      const [openRouterApiKeyInput, setOpenRouterApiKeyInput] = useState(null);
      const [cerebrasApiKey, setCerebrasApiKey] = useState(null);
      const [lemonfoxApiKey, setLemonfoxApiKey] = useState(null);
      const [openRouterApiKey, setOpenRouterApiKey] = useState(null);
      const [openAiApiKey, setOpenAiApiKey] = useState(null);
      const [apiValidationStatus, setApiValidationStatus] = useState({
        google: 'none',
        openRouter: 'none',
        cerebras: 'none',
        lemonfox: 'none',
        openai: 'none',
      });

      useEffect(() => {
        validateApiKey('google', googleApiKey);
      }, [googleApiKey]);


  useEffect(() => {
    validateApiKey('openRouter', openRouterApiKeyInput);
  }, [openRouterApiKeyInput]);

  useEffect(() => {
    validateApiKey('cerebras', cerebrasApiKey);
  }, [cerebrasApiKey]);

      useEffect(() => {
        validateApiKey('lemonfox', lemonfoxApiKey);
      }, [lemonfoxApiKey]);

      useEffect(() => {
        validateApiKey('openai', openAiApiKey);
      }, [openAiApiKey]);
const [isRecording, startRecording, stopRecording] = useAudioRecording();

useEffect(() => {
  if (scrollViewRef.current) {
    scrollViewRef.current.scrollToEnd({ animated: true });
  }
}, [messages]);

  const validateApiKey = async (apiType, apiKey) => {
    setApiValidationStatus((prev) => ({ ...prev, [apiType]: 'none' }));
    
    if (!apiKey?.trim()) {
      setApiValidationStatus((prev) => ({ ...prev, [apiType]: 'error' }));
      return;
    }

    try {
      let isValid = false;
      let validationTimeout;

      switch (apiType) {
        case 'google':
          try {
            const response = await axios.get(
              `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
            );
            isValid = response.status === 200;
          } catch (error) {
            console.error('Google API validation failed:', error);
          }
          break;

      case 'openRouter':
          try {
            const response = await fetch(
              'https://openrouter.ai/api/v1/auth/key',
              {
                method: 'GET',
                headers: { Authorization: `Bearer ${apiKey}` },
              },
            );
            isValid = response.ok;
          } catch (error) {
            console.error('OpenRouter API validation failed:', error);
          }
          break;

        case 'cerebras':
          try {
            const response = await axios.get(
              'https://api.cerebras.ai/v1/models',
              {
                headers: { Authorization: `Bearer ${apiKey}` },
              },
            );
            isValid = response.status === 200;
          } catch (error) {
            console.error('Cerebras API validation failed:', error);
          }
          break;

        case 'lemonfox':
          try {
            const response = await axios.get(
              'https://api.lemonfox.ai/v1/models',
              {
                headers: { Authorization: `Bearer ${apiKey}` },
              },
            );
            isValid = response.status === 200;
          } catch (error) {
            console.error('Lemonfox API validation failed:', error);
          }
          break;

        case 'openai':
          try {
            const response = await axios.get(
              'https://api.openai.com/v1/models',
              {
                headers: { Authorization: `Bearer ${apiKey}` },
              },
            );
            isValid = response.status === 200;
          } catch (error) {
            console.error('OpenAI API validation failed:', error);
          }
          break;
      }

      setApiValidationStatus((prev) => ({
        ...prev,
        [apiType]: isValid ? 'success' : 'error',
      }));
    } catch (error) {
      console.error('API key validation failed:', error);
      setApiValidationStatus((prev) => ({ ...prev, [apiType]: 'error' }));
      setTimeout(() => {
        setApiValidationStatus((prev) => ({ ...prev, [apiType]: 'none' }));
      }, 2000);
    }
  };
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  const [isWhisperProviderExpanded, setIsWhisperProviderExpanded] = useState(false);
  const [isApiSelectionExpanded, setIsApiSelectionExpanded] = useState(false);
  const [selectedWhisperProvider, setSelectedWhisperProvider] = useState(null);
  const [isApiKeysExpanded, setIsApiKeysExpanded] = useState(false);
  const [isAddingNewModel, setIsAddingNewModel] = useState(false);
  const [isSystemPromptExpanded, setIsSystemPromptExpanded] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelValue, setNewModelValue] = useState('');
      const [newModelShortName, setNewModelShortName] = useState('');
          const [systemPrompt, setSystemPrompt] = useState(
            'Please respond as succinctly as possible, ensuring clarity and completeness. Prioritize brevity without sacrificing precision or understanding. Use concise language, expanding only when necessary to maintain accuracy. Incorporate principles of Nonviolent Communication naturally and thoughtfully, where relevant. When sharing code, provide only the complete code and add additional explanations only if absolutely necessary for clarity.',
          );

  const [recentPrompts, setRecentPrompts] = useState([]);

  const saveApiKeys = async () => {
    try {
      if (googleApiKey) {
        await setSecretStorage('google-api-key', { key: googleApiKey });
      }
      if (openRouterApiKeyInput) {
        await setSecretStorage('openrouter-api-key', {
          key: openRouterApiKeyInput,
        });
        setOpenRouterApiKey(openRouterApiKeyInput);
      }
      if (cerebrasApiKey) {
        await setSecretStorage('cerebras-api-key', {
          key: cerebrasApiKey,
        });
      }
      if (openAiApiKey) {
        await setSecretStorage('openai-api-key', {
          key: openAiApiKey,
        });
      }
      setIsSettingsModalVisible(false);
    } catch (error) {
      console.error('Fehler beim Speichern der API-Schlüssel:', error);
      Alert.alert('Error', 'The API keys could not be saved.');
    }
  };

  useEffect(() => {
    const availableProviders = [];
    if (apiValidationStatus.openai === 'success') {
      availableProviders.push('openai');
    }
    if (apiValidationStatus.lemonfox === 'success') {
      availableProviders.push('lemonfox');
    }

    if (availableProviders.length === 1) {
      setSelectedWhisperProvider(availableProviders[0]);
    }
  }, [apiValidationStatus]);

  useEffect(() => {
    const loadApiKeys = async () => {
      try {
        const storedGoogleKey = await getSecretStorage('google-api-key');
        const storedOpenRouterKey =
          await getSecretStorage('openrouter-api-key');
        if (storedGoogleKey) setGoogleApiKey(storedGoogleKey.key);
        if (storedOpenRouterKey) {
          setOpenRouterApiKey(storedOpenRouterKey.key);
          setOpenRouterApiKeyInput(storedOpenRouterKey.key);
        }
        const storedCerebrasKey = await getSecretStorage('cerebras-api-key');
        if (storedCerebrasKey) {
          setCerebrasApiKey(storedCerebrasKey.key);
        }
const storedOpenAiKey = await getSecretStorage('openai-api-key');
        if (storedOpenAiKey) {
          setOpenAiApiKey(storedOpenAiKey.key);
        }
      } catch (error) {
        console.error('Fehler beim Laden der API-Schlüssel:', error);
      }
    };

    loadApiKeys();
  }, []);

  useEffect(() => {
    const initializeApiValidation = async () => {
      await validateApiKey('google', googleApiKey);
      await validateApiKey('openRouter', openRouterApiKeyInput);
      await validateApiKey('cerebras', cerebrasApiKey);
      await validateApiKey('lemonfox', lemonfoxApiKey);
    };

    initializeApiValidation();
  }, [googleApiKey, openRouterApiKeyInput, cerebrasApiKey, lemonfoxApiKey]);

  const handleTranscription = async (base64Audio) => {
    try {
      if (!selectedWhisperProvider) {
        throw new Error('Please select a Whisper provider in settings first.');
      }

      const formData = new FormData();
      formData.append('file', {
        uri: `data:audio/mp3;base64,${base64Audio}`,
        type: 'audio/mp3',
        name: 'recording.mp3',
      } );

      if (selectedWhisperProvider === 'openai') {
        if (!openAiApiKey?.trim()) {
          throw new Error('No valid OpenAI API key available.');
        }

        formData.append('model', 'whisper-1');
        formData.append('response_format', 'json');
        formData.append('language', 'de');

        const response = await axios.post(
          'https://api.openai.com/v1/audio/transcriptions',
          formData,
          {
            headers: {
              Authorization: `Bearer ${openAiApiKey}`,
              'Content-Type': 'multipart/form-data',
            },
          },
        );

        if (response.data?.text) {
          setInputText((prevInputText) =>
            prevInputText
              ? `${prevInputText} ${response.data.text}`
              : response.data.text,
          );
        }
      } else if (selectedWhisperProvider === 'lemonfox') {
        if (!lemonfoxApiKey?.trim()) {
          throw new Error('No valid LemonFox API key available.');
        }

        formData.append('response_format', 'json');
        formData.append('detect_language', 'true');

        const response = await axios.post(
          'https://api.lemonfox.ai/v1/audio/transcriptions',
          formData,
          {
            headers: {
              Authorization: `Bearer ${lemonfoxApiKey}`,
              'Content-Type': 'multipart/form-data',
            },
          },
        );

        if (response.data?.text) {
          setInputText((prevInputText) =>
            prevInputText
              ? `${prevInputText} ${response.data.text}`
              : response.data.text,
          );
        }
      } else {
        Alert.alert('Error', 'The selected API does not support transcription.');
      }
    } catch (error) {
      console.error('Error in audio transcription:', error);
      Alert.alert('Error', 'The audio recording could not be transcribed');
    }
  };

  const handleFileUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        base64: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const fileData = {
          uri: result.assets[0].uri,
          name: result.assets[0].uri.split('/').pop(),
          base64: result.assets[0].base64,
          type: result.assets[0].type,
        };

        if (fileData.type !== 'image' && fileData.base64.length > 500 * 1024) {
          Alert.alert('Error', 'File must be smaller than 500 KB');
          return;
        }

        setUploadedFile(fileData);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      Alert.alert('Error', 'Could not upload the file. Please try again.');
    }
  };

  const sendMessage = async (text = inputText) => {
    const selectedModelConfig = availableModels.find(
      (m) => m.value === selectedModel,
    );

    if (!text.trim() && (!uploadedFile || selectedModelConfig?.api !== 'google')) {
      return;
    }

    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMessage = {
      text: text.trim() ? text : `Datei hochgeladen: ${uploadedFile?.name || 'Unbekannte Datei'}`,
      isUser: true,
      timestamp,
    };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      let response;
      const selectedModelConfig = availableModels.find(
        (m) => m.value === selectedModel,
      );

      if (selectedModelConfig.api === 'google') {
        if (!googleApiKey?.trim()) {
          throw new Error('No valid Google API key available.');
        }

        const parts = [];
       
        parts.push({ text: systemPrompt });

        messages.forEach(message => {
          if (message.isUser) {
            parts.push({ text: message.text });
          } else {
            parts.push({ text: `Assistant: ${message.text}` });
          }
        });

        if (text.trim()) {
          parts.push({ text });
        }

        if (uploadedFile?.base64 && uploadedFile.type === 'image') {
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: uploadedFile.base64,
            },
          });
          parts.push({ text: "Please describe what you see in this image and provide relevant insights." });
        } else if (uploadedFile?.content) {
          parts.push({
            text: `Hochgeladene Datei: ${uploadedFile.name}\n\n${uploadedFile.content}`,
          });
        }

        response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${googleApiKey}`,
          {
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.7,
              topK: 1,
              topP: 1,
              maxOutputTokens: 2048,
              stopSequences: [],
            },
          },
        );

        let responseContent = '';
        if (response.data?.candidates?.[0]?.content?.parts) {
          responseContent = response.data.candidates[0].content.parts
            .map(part => part.text || '')
            .join('');
        }

        const llmMessage = {
          text: responseContent,
          isUser: false,
          timestamp,
        };
        setMessages((prevMessages) => [...prevMessages, llmMessage]);
      } else if (selectedModelConfig.api === 'cerebras') {
        if (!cerebrasApiKey || cerebrasApiKey.trim() === '') {
          throw new Error('Kein gültiger Cerebras API-Schlüssel vorhanden.');
        }
        const chatHistory = messages.map((message) => ({
          role: message.isUser ? 'user' : 'assistant',
          content: message.text,
        }));
        chatHistory.push({ role: 'system', content: systemPrompt });
        chatHistory.push({ role: 'user', content: text });

        response = await axios.post(
          'https://api.cerebras.ai/v1/chat/completions',
          {
            messages: chatHistory,
            model: selectedModel,
            stream: false,
            temperature: 0,
            max_completion_tokens: -1,
            seed: 0,
            top_p: 1,
          },
          {
            headers: { Authorization: `Bearer ${cerebrasApiKey}` },
          },
        );

        const llmMessage = {
          text: response.data.choices[0].message.content,
          isUser: false,
          timestamp,
        };
        setMessages((prevMessages) => [...prevMessages, llmMessage]);
      } else if (selectedModelConfig.api === 'openrouter') {
        if (!openRouterApiKey || openRouterApiKey.trim() === '') {
          throw new Error('Kein gültiger OpenRouter API-Schlüssel vorhanden.');
        }
        const chatHistory = messages.map((message) => ({
          role: message.isUser ? 'user' : 'assistant',
          content: message.text,
        }));
        chatHistory.push({ role: 'system', content: systemPrompt });
        chatHistory.push({ role: 'user', content: text });

        response = await axios.post(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            messages: chatHistory,
            model: selectedModel,
          },
          {
            headers: { Authorization: `Bearer ${openRouterApiKey}` },
          },
        );

        const llmMessage = {
          text: response.data.choices[0].message.content,
          isUser: false,
          timestamp,
        };
        setMessages((prevMessages) => [...prevMessages, llmMessage]);
      } else if (selectedModelConfig.api === 'openai') {
        if (!openAiApiKey || openAiApiKey.trim() === '') {
          throw new Error('No valid OpenAI API key available.');
        }
        const chatHistory = messages.map((message) => ({
          role: message.isUser ? 'user' : 'assistant',
          content: message.text,
        }));
        chatHistory.push({ role: 'system', content: systemPrompt });
        chatHistory.push({ role: 'user', content: text });

        response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            messages: chatHistory,
            model: selectedModel,
            temperature: 0.7,
          },
          {
            headers: { Authorization: `Bearer ${openAiApiKey}` },
          },
        );

        const llmMessage = {
          text: response.data.choices[0].message.content,
          isUser: false,
          timestamp,
        };
        setMessages((prevMessages) => [...prevMessages, llmMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          text: 'Error: Could not get a response. Please try again.',
          isUser: false,
          timestamp,
        },
      ]);
    } finally {
      setUploadedFile(null);
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
{copyFeedback && (
            <View style={styles.copyFeedback}>
              <Text style={styles.copyFeedbackText}>✔</Text>
            </View>
          )}

          <View style={styles.header}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.modelButtonsContainer}
            >
              {availableModels
                .filter((model) => {
                  const validationKey = getApiValidationKey(model.api);
                  return model.quickAccess &&
                         apiValidationStatus[validationKey] === 'success';
                })
    .sort((a, b) => {
      if (a.shortName === 'T') return 1;
      if (b.shortName === 'T') return -1;
      if (a.shortName === 'M') return 1;
      if (b.shortName === 'M') return -1;
      return a.shortName.localeCompare(b.shortName);
    })
                .map((model) => (
                  <TouchableOpacity
                    key={model.value}
                    style={[
                      styles.modelButton,
                      selectedModel === model.value &&
                        styles.selectedModelButton,
                    ]}
                    onPress={() => handleModelSelection(model)}
                  >
                    <Text
                      style={[
                        styles.modelButtonText,
                        selectedModel === model.value &&
                          styles.selectedModelButtonText,
                      ]}
                    >
                      {model.shortName}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <Animated.View
              style={[styles.selectedModelNameContainer, { opacity: fadeAnim }]}
            >
              <Text style={styles.selectedModelNameText}>
                {selectedModelName}
              </Text>
            </Animated.View>
            <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity
                onPress={() => {
                  saveCurrentChat();
                  setMessages([]);
                }}
                style={styles.settingsButton}
              >
                <Ionicons name="refresh-outline" size={24} color="#00897B" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsHistoryModalVisible(true)}
                style={styles.settingsButton}
              >
                <Ionicons
                  name="folder-open-outline"
                  size={24}
                  color="#00897B"
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => setIsSettingsModalVisible(true)}
              style={styles.settingsButton}
            >
              <Ionicons name="settings-outline" size={24} color="#00897B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.chatContainer}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map((message, index) => (
              <TouchableOpacity
                key={index}
                onLongPress={() => copyToClipboard(message.text, index)}
                style={[
                  message.isUser ? styles.userMessage : styles.llmMessage,
                  message.isHighlighted && styles.highlightedMessage,
                  message.isCoT && styles.cotMessage,
                ]}
              >
                {message.isHighlighted && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#4CAF50"
                    style={styles.singleCheckmark}
                  />
                )}
                <Text
                  style={[
                    styles.messageText,
                    message.isCoT && styles.cotMessageText,
                  ]}
                >
                  {message.isCoT
                    ? 'Thinking Process:\n\n' + message.text
                    : message.text}
                </Text>
                <Text style={styles.timestampText}>{message.timestamp}</Text>
              </TouchableOpacity>
            ))}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#00897B" />
                <Text style={styles.loadingText}>AI is responding...</Text>
              </View>
            )}
          </ScrollView>
          <Animated.View
            style={[styles.selectedModelNameContainer, { opacity: fadeAnim }]}
          >
            <Text style={styles.selectedModelNameText}>
              {selectedModelName}
            </Text>
          </Animated.View>

          <View style={styles.inputContainer}>
            {availableModels.find((model) => model.value === selectedModel)?.api === 'google' && (
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleFileUpload}
              >
                <Ionicons name="attach" size={24} color="#00897B" />
              </TouchableOpacity>
            )}
            <View style={styles.inputWrapper}>
              {availableModels.find((model) => model.value === selectedModel)?.api === 'google' && uploadedFile && (
                <View style={styles.uploadedFileIndicator}>
                  <Ionicons name="image" size={16} color="#00897B" />
                  <Text style={styles.uploadedFileName} numberOfLines={1}>
                    {uploadedFile.name}
                  </Text>
                </View>
              )}
              <TextInput
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Enter message..."
                multiline
              />
            </View>
            <View style={styles.rightButtonsContainer}>
              {(apiValidationStatus.lemonfox === 'success' || apiValidationStatus.openai === 'success') && (
                <TouchableOpacity
                  style={[
                    styles.uploadButton,
                    isRecording && styles.recordingButton,
                  ]}
                  onPress={async () => {
                    if (isRecording) {
                      const { base64Audio } = await stopRecording();
                      if (base64Audio) {
                        await handleTranscription(base64Audio);
                      }
                    } else {
                      await startRecording();
                    }
                  }}
                >
                  <Ionicons
                    name={isRecording ? 'mic' : 'mic-outline'}
                    size={24}
                    color={isRecording ? '#FF0000' : '#00897B'}
                  />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.sendButton}
                onPress={() => sendMessage()}
              >
                <Ionicons name="send" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
  {isHistoryModalVisible && (
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>Chat History</Text>
              {chatHistory.length === 0 ? (
                <Text
                  style={{
                    textAlign: 'center',
                    marginVertical: 20,
                    color: '#666',
                  }}
                >
                  No chat history available.
                </Text>
              ) : (
                <ScrollView>
                  {chatHistory.map((history) => (
                    <View key={history.id} style={styles.historyItem}>
                      <TouchableOpacity
                        onPress={() => viewChatHistory(history)}
                        style={styles.historyButton}
                      >
                        <Text style={styles.historyText}>{history.name}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => deleteChatHistory(history.id)}
                        style={styles.deleteHistoryButton}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color="#FF0000"
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
              <Animated.View
                style={[
                  styles.selectedModelNameContainer,
                  { opacity: fadeAnim },
                ]}
              >
                <Text style={styles.selectedModelNameText}>
                  {selectedModelName}
                </Text>
              </Animated.View>
              <TouchableOpacity
                onPress={() => setIsHistoryModalVisible(false)}
                style={styles.closeModalButton}
              >
                <Text style={styles.closeModalText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}

          {isSettingsModalVisible && (
            <View style={styles.modalContainer}>
              <ScrollView>
                <Text style={styles.modalTitle}>API Settings</Text>

                <TouchableOpacity
                  onPress={() => setIsApiKeysExpanded(!isApiKeysExpanded)}
                  style={styles.accordionHeader}
                >
                  <Text style={styles.accordionHeaderText}>API keys</Text>
                  <Ionicons
                    name={isApiKeysExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#00897B"
                  />
                </TouchableOpacity>

                {isApiKeysExpanded && (
                  <View style={styles.apiKeysContainer}>
                    <Text style={styles.apiDescription}>
                      Google AI Studio - For Gemini Models
                    </Text>
                    <View style={styles.inputWithValidation}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginRight: 0 }]}
                        value={googleApiKey}
                        onChangeText={(text) => {
                          setGoogleApiKey(text);
                          validateApiKey('google', text);
                        }}
                        placeholder="Google API Key"
                        secureTextEntry
                        onBlur={() => validateApiKey('google', googleApiKey)}
                      />
                      {apiValidationStatus.google === 'success' && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#4CAF50"
                        />
                      )}
                      {apiValidationStatus.google === 'error' && (
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color="#FF5252"
                        />
                      )}
                    </View>
                    <Text style={styles.apiDescription}>
                      OpenRouter - Access to various LLMs
                    </Text>
                    <View style={styles.inputWithValidation}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginRight: 0 }]}
                        value={openRouterApiKeyInput}
                        onChangeText={(text) => {
                          setOpenRouterApiKeyInput(text);
                          validateApiKey('openRouter', text);
                        }}
                        placeholder="OpenRouter API Key"
                        secureTextEntry
                        onBlur={() =>
                          validateApiKey('openRouter', openRouterApiKeyInput)
                        }
                      />
                      {apiValidationStatus.openRouter === 'success' && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#4CAF50"
                        />
                      )}
                      {apiValidationStatus.openRouter === 'error' && (
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color="#FF5252"
                        />
                      )}
                    </View>
                    <Text style={styles.apiDescription}>
                      Cerebras - Optimized LLM Inference
                    </Text>
                    <View style={styles.inputWithValidation}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginRight: 0 }]}
                        value={cerebrasApiKey}
                        onChangeText={(text) => {
                          setCerebrasApiKey(text);
                          validateApiKey('cerebras', text);
                        }}
                        placeholder="Cerebras API Key"
                        secureTextEntry
                        onBlur={() => validateApiKey('cerebras', cerebrasApiKey)}
                      />
                      {apiValidationStatus.cerebras === 'success' && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#4CAF50"
                        />
                      )}
                      {apiValidationStatus.cerebras === 'error' && (
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color="#FF5252"
                        />
                      )}
                    </View>
                    <Text style={styles.apiDescription}>
                      LemonFox - Audio Transcription
                    </Text>
                    <View style={styles.inputWithValidation}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginRight: 0 }]}
                        value={lemonfoxApiKey}
                        onChangeText={(text) => {
                          setLemonfoxApiKey(text);
                          validateApiKey('lemonfox', text);
                        }}
                        placeholder="LemonFox API Key"
                        secureTextEntry
                        onBlur={() => validateApiKey('lemonfox', lemonfoxApiKey)}
                      />
                      {apiValidationStatus.lemonfox === 'success' && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#4CAF50"
                        />
                      )}
                      {apiValidationStatus.lemonfox === 'error' && (
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color="#FF5252"
                        />
                      )}
                    </View>
                    <Text style={styles.apiDescription}>
                      OpenAI - GPT Models
                    </Text>
                    <View style={styles.inputWithValidation}>
                      <TextInput
                        style={[styles.input, { flex: 1, marginRight: 0 }]}
                        value={openAiApiKey}
                        onChangeText={(text) => {
                          setOpenAiApiKey(text);
                          validateApiKey('openai', text);
                        }}
                        placeholder="OpenAI API Key"
                        secureTextEntry
                        onBlur={() => validateApiKey('openai', openAiApiKey)}
                      />
                      {apiValidationStatus.openai === 'success' && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#4CAF50"
                        />
                      )}
                      {apiValidationStatus.openai === 'error' && (
                        <Ionicons
                          name="close-circle"
                          size={20}
                          color="#FF5252"
                        />
                      )}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  onPress={() =>
                    setIsApiSelectionExpanded(!isApiSelectionExpanded)
                  }
                  style={styles.accordionHeader}
                >
                  <Text style={styles.accordionHeaderText}>Select Models</Text>
                  <Ionicons
                    name={
                      isApiSelectionExpanded ? 'chevron-up' : 'chevron-down'
                    }
                    size={20}
                    color="#00897B"
                  />
                </TouchableOpacity>

                {isApiSelectionExpanded && (
                  <>
                    <View style={styles.dropdownContainer}>
                      <View style={styles.dropdown}>
                        {['openrouter', 'google', 'cerebras', 'openai'].map(
                          (api) => (
                            <TouchableOpacity
                              key={api}
                              style={[
                                styles.apiButton,
                                selectedApi === api && styles.selectedApiButton,
                              ]}
                              onPress={() => handleApiSelection(api)}
                            >
                              <Text
                                style={[
                                  styles.apiButtonText,
                                  selectedApi === api &&
                                    styles.selectedApiButtonText,
                                ]}
                              >
                                {api.charAt(0).toUpperCase() + api.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          ),
                        )}
                      </View>
                    </View>
                    <ScrollView style={styles.modelList}>
                      {availableModels
                        .filter((model) => {
                          const validationKey = getApiValidationKey(model.api);
                          return (
                            model.api === selectedApi &&
                            apiValidationStatus[validationKey] === 'success'
                          );
                        })
                        .map((model) => (
                          <View
                            key={model.value}
                            style={styles.modelEditContainer}
                          >
                            <TouchableOpacity
                              onPress={() => toggleQuickAccess(model.value)}
                              style={[
                                styles.quickAccessButton,
                                model.quickAccess &&
                                  styles.quickAccessButtonActive,
                              ]}
                            >
                              <Ionicons
                                name="checkmark-circle"
                                size={20}
                                color={model.quickAccess ? '#4CAF50' : '#ccc'}
                              />
                            </TouchableOpacity>
                            <View style={styles.modelNameContainer}>
                              <Text style={styles.modelButtonText}>
                                {model.name}
                              </Text>
                            </View>
                            <TextInput
                              style={styles.shortNameInput}
                              value={model.shortName}
                              onChangeText={(text) => {
                                setAvailableModels((prevModels) =>
                                  prevModels.map((m) =>
                                    m.value === model.value
                                      ? { ...m, shortName: text }
                                      : m,
                                  ),
                                );
                              }}
                              placeholder="Shortcode"
                              maxLength={3}
                            />
                            <TouchableOpacity
                              onPress={() => deleteModel(model.value)}
                              style={styles.deleteModelButton}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={20}
                                color="#FF0000"
                              />
                            </TouchableOpacity>
                          </View>
                        ))}
                    </ScrollView>
     {availableModels
                      .filter((model) => {
                        const validationKey = getApiValidationKey(model.api);
                        return (
                          model.api === selectedApi &&
                          apiValidationStatus[validationKey] === 'success'
                        );
                      }).length === 0 && (
                      <Text
                        style={{
                          textAlign: 'center',
                          color: '#FF5252',
                          marginTop: 10,
                          marginBottom: 10,
                          fontStyle: 'italic',
                        }}
                      >
                        No models available. Please check your API keys.
                      </Text>
                    )}
                    {isAddingNewModel ? (
                      <View style={styles.newModelInputContainer}>
                        <TextInput
                          style={styles.modelInput}
                          value={newModelName}
                          onChangeText={setNewModelName}
                          placeholder="Model name (e.g. Qwen)"
                        />
                        <TextInput
                          style={styles.modelInput}
                          value={newModelValue}
                          onChangeText={setNewModelValue}
                          placeholder="Model value (e.g. qwen/qvq-72b-preview)"
                        />
                        <TextInput
                          style={styles.modelInput}
                          value={newModelShortName}
                          onChangeText={setNewModelShortName}
                          placeholder="Short name (e.g. Q)"
                          maxLength={3}
                        />
                        <View style={styles.newModelButtonsContainer}>
                          <TouchableOpacity
                            onPress={addNewModel}
                            style={[styles.addModelButton, { flex: 1 }]}
                          >
                            <Text style={styles.addModelButtonText}>Add</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setIsAddingNewModel(false)}
                            style={[
                              styles.addModelButton,
                              { flex: 1, backgroundColor: '#FF0000' },
                            ]}
                          >
                            <Text style={styles.addModelButtonText}>
                              Cancel
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.addModelButton,
                          apiValidationStatus[getApiValidationKey(selectedApi)] !==
                            'success' && {
                            backgroundColor: '#cccccc',
                          },
                        ]}
                        onPress={() => {
                          const validationKey = getApiValidationKey(selectedApi);
                          if (apiValidationStatus[validationKey] !== 'success') {
                            Alert.alert(
                              'Error',
                              'Please ensure that a valid API key is available for this provider.',
                            );
                            return;
                          }
                          setIsAddingNewModel(true);
                        }}
                      >
                        <Text style={styles.addModelButtonText}>
                          + Add New Model
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                <TouchableOpacity
                  onPress={() =>
                    setIsSystemPromptExpanded(!isSystemPromptExpanded)
                  }
                  style={styles.accordionHeader}
                >
                  <Text style={styles.accordionHeaderText}>System Prompt</Text>
                  <Ionicons
                    name={
                      isSystemPromptExpanded ? 'chevron-up' : 'chevron-down'
                    }
                    size={20}
                    color="#00897B"
                  />
                </TouchableOpacity>

                {isSystemPromptExpanded && (
                  <View style={styles.apiKeysContainer}>
                    <TextInput
                      style={styles.input}
                      value={systemPrompt}
                      onChangeText={setSystemPrompt}
                      placeholder="Enter custom system prompt..."
                      multiline
                    />
                  </View>
                )}

                <TouchableOpacity
                  onPress={() =>
                    setIsWhisperProviderExpanded(!isWhisperProviderExpanded)
                  }
                  style={styles.accordionHeader}
                >
                  <Text style={styles.accordionHeaderText}>Whisper Provider</Text>
                  <Ionicons
                    name={
                      isWhisperProviderExpanded ? 'chevron-up' : 'chevron-down'
                    }
                    size={20}
                    color="#00897B"
                  />
                </TouchableOpacity>

                {isWhisperProviderExpanded && (
                  <View style={styles.whisperProviderContainer}>
                    <View style={styles.providerButtonsContainer}>
                      <TouchableOpacity
                        style={[
                          styles.providerButton,
                          selectedWhisperProvider === 'openai' &&
                            styles.selectedProviderButton,
                          apiValidationStatus.openai !== 'success' &&
                            styles.disabledProviderButton,
                        ]}
                        disabled={apiValidationStatus.openai !== 'success'}
                        onPress={() => setSelectedWhisperProvider('openai')}
                      >
                        <Text
                          style={[
                            styles.providerButtonText,
                            selectedWhisperProvider === 'openai' &&
                              styles.selectedProviderButtonText,
                            apiValidationStatus.openai !== 'success' &&
                              styles.disabledProviderButtonText,
                          ]}
                        >
                          OpenAI
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.providerButton,
                          selectedWhisperProvider === 'lemonfox' &&
                            styles.selectedProviderButton,
                          apiValidationStatus.lemonfox !== 'success' &&
                            styles.disabledProviderButton,
                        ]}
                        disabled={apiValidationStatus.lemonfox !== 'success'}
                        onPress={() => setSelectedWhisperProvider('lemonfox')}
                      >
                        <Text
                          style={[
                            styles.providerButtonText,
                            selectedWhisperProvider === 'lemonfox' &&
                              styles.selectedProviderButtonText,
                            apiValidationStatus.lemonfox !== 'success' &&
                              styles.disabledProviderButtonText,
                          ]}
                        >
                          LemonFox
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </ScrollView>
              <TouchableOpacity
                onPress={() => setIsSettingsModalVisible(false)}
                style={styles.closeModalButton}
              >
                <Text style={styles.closeModalText}>Close</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  modelButtonsContainer: {
    flex: 1,
    marginRight: 10,
  },
  modelButton: {
    padding: 8,
    marginHorizontal: 4,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    minWidth: 40,
    alignItems: 'center',
  },
  selectedModelButton: {
    backgroundColor: '#00897B',
  },
  modelButtonText: {
    color: '#333',
    fontSize: 14,
  },
  selectedModelButtonText: {
    color: '#fff',
  },
  settingsButton: {
    padding: 8,
  },
  chatContainer: {
    flex: 1,
    padding: 10,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C6',
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
    maxWidth: '80%',
  },
  llmMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8E8E8',
    padding: 10,
    borderRadius: 10,
    marginVertical: 5,
    maxWidth: '80%',
  },
  messageText: {
    fontSize: 16,
    color: '#000',
  },
  timestampText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  inputWrapper: {
    flex: 1,
    marginHorizontal: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    maxHeight: 100,
  },
  input: {
    padding: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#00897B',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButton: {
    padding: 8,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  modalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    padding: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#00897B',
  },
  closeModalButton: {
    backgroundColor: '#00897B',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  closeModalText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f5f5f5',
    marginTop: 10,
    borderRadius: 10,
  },
  accordionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00897B',
  },
  apiKeysContainer: {
    padding: 15,
  },
  inputWithValidation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  apiDescription: {
    color: '#666',
    marginBottom: 5,
    fontSize: 14,
  },
  dropdownContainer: {
    padding: 15,
  },
  dropdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  apiButton: {
    padding: 10,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
    minWidth: 100,
    alignItems: 'center',
  },
  selectedApiButton: {
    backgroundColor: '#00897B',
  },
  apiButtonText: {
    color: '#333',
  },
  selectedApiButtonText: {
    color: '#fff',
  },
  modelList: {
    maxHeight: 200,
  },
  modelEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  quickAccessButton: {
    padding: 5,
  },
  modelNameContainer: {
    flex: 1,
    marginHorizontal: 10,
  },
  shortNameInput: {
    width: 50,
    padding: 5,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginRight: 10,
    textAlign: 'center',
  },
  deleteModelButton: {
    padding: 5,
  },
  addModelButton: {
    backgroundColor: '#00897B',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  addModelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  newModelInputContainer: {
    padding: 15,
  },
  modelInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
  },
  newModelButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  whisperProviderContainer: {
    padding: 15,
  },
  providerButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  providerButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  selectedProviderButton: {
    backgroundColor: '#00897B',
  },
  disabledProviderButton: {
    backgroundColor: '#e0e0e0',
  },
  providerButtonText: {
    color: '#333',
    fontSize: 16,
  },
  selectedProviderButtonText: {
    color: '#fff',
  },
  disabledProviderButtonText: {
    color: '#999',
  },
  uploadedFileIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    backgroundColor: '#e0e0e0',
    borderRadius: 15,
    marginHorizontal: 10,
    marginTop: 5,
  },
  uploadedFileName: {
    marginLeft: 5,
    fontSize: 12,
    color: '#666',
  },
  copyFeedback: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  copyFeedbackText: {
    color: '#fff',
    fontSize: 24,
  },
  highlightedMessage: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  singleCheckmark: {
    position: 'absolute',
    right: 5,
    top: 5,
  },
  cotMessage: {
    backgroundColor: '#E3F2FD',
  },
  cotMessageText: {
    color: '#1565C0',
  },
  selectedModelNameContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 5,
  },
  selectedModelNameText: {
    color: '#fff',
    fontSize: 14,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  historyButton: {
    flex: 1,
  },
  historyText: {
    fontSize: 16,
    color: '#333',
  },
  deleteHistoryButton: {
    padding: 10,
  },
  rightButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingButton: {
    backgroundColor: 'rgba(255,0,0,0.1)',
    borderRadius: 20,
  },
});

export default RootApp;
